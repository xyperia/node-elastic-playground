require('dotenv').config();
const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const OpenAI = require('openai');
const cors = require('cors');

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ES_ENDPOINT,
  auth: { apiKey: process.env.ES_API_KEY }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
app.use(express.json());
app.use(cors());

const indexSourceFields = {
  'general-rules-pdf': ['content']
};

// Fetch results from Elasticsearch
async function getElasticsearchResults(query) {
  const esQuery = {
    retriever: {
      standard: {
        query: {
          multi_match: {
            query: query,
            fields: ['content']
          }
        }
      }
    },
    size: 3
  };

  try {
    const result = await esClient.search({
      index: 'general-rules-pdf',
      body: esQuery
    });
    return result.hits.hits;
  } catch (error) {
    console.error('Error fetching results from Elasticsearch:', error);
    return [];
  }
}

// Create prompt for OpenAI
function createOpenaiPrompt(results) {
  let context = '';
  for (const hit of results) {
    const innerHitPath = `${hit._index}.${indexSourceFields[hit._index][0]}`;
    if (hit.inner_hits && hit.inner_hits[innerHitPath]) {
      context += hit.inner_hits[innerHitPath].hits.hits.map(innerHit => innerHit._source.text).join('\n --- \n');
    } else {
      const sourceField = indexSourceFields[hit._index][0];
      const hitContext = hit._source[sourceField];
      context += `${hitContext}\n`;
    }
  }

  const prompt = `
  Petunjuk:

  - Kamu adalah AI Assisten yang hanya menjawab pertanyaan berdasarkan konteks berikut ini. Jika kamu tidak bisa menjawab pertanyaannya menggunakan konteks ini, cukup jawab "Saya tidak tahu"
  - Jawab pertanyaan dengan jujur ​​dan berdasarkan fakta dengan hanya menggunakan konteks yang disajikan.
  - Jika Anda tidak tahu jawabannya, katakan saja bahwa Anda tidak tahu, jangan mengarang jawaban.
  - Anda harus selalu mengutip dokumen tempat jawaban diambil menggunakan gaya kutipan akademis sebaris [], dengan menggunakan posisi.
  - Gunakan format markdown untuk contoh kode.
  - Anda benar, berdasarkan fakta, tepat, dan dapat diandalkan.

  Konteks:
  ${context}
  `;
  return prompt;
}

// Handle OpenAI token-by-token responses
async function generateOpenaiCompletion(userPrompt, question, res) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: userPrompt },
        { role: 'user', content: question }
      ],
      stream: true
    });

    // Handle token streaming
    for await (const message of response) {
      if (message.choices[0]?.delta?.content) {
        res.write(message.choices[0].delta.content);
      }
    }
    res.end();  // Close the stream when the response is complete
  } catch (error) {
    console.error('Error generating OpenAI completion:', error);
    res.status(500).send('Error generating response');
  }
}

// API endpoint to handle chat requests
app.post('/chat', async (req, res) => {
  const { question } = req.body;
  
  // Fetch Elasticsearch results
  const elasticsearchResults = await getElasticsearchResults(question);
  
  // Create OpenAI prompt
  const contextPrompt = createOpenaiPrompt(elasticsearchResults);

  // Stream response token-by-token
  res.setHeader('Content-Type', 'text/plain');
  await generateOpenaiCompletion(contextPrompt, question, res);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
