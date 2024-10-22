require('dotenv').config();
const { Client } = require('@elastic/elasticsearch');
const OpenAI = require('openai');
const readline = require('readline');

// Initialize Elasticsearch client with the endpoint from .env
const esClient = new Client({
  node: process.env.ES_ENDPOINT, // Load the Elasticsearch endpoint from the environment variables
  auth: {
    apiKey: process.env.ES_API_KEY
  },
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

// Initialize OpenAI client (directly passing the API key)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    return [];  // Return an empty array if there's an error
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

// Generate OpenAI completion token by token
async function generateOpenaiCompletion(userPrompt, question) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: userPrompt },
        { role: 'user', content: question }
      ],
      stream: true // Enable streaming response
    });

    // Handle streaming response
    for await (const message of response) {
      if (message.choices[0]?.delta?.content) {
        process.stdout.write(message.choices[0].delta.content);
      }
    }
    console.log(); // Ensure a new line after the response
  } catch (error) {
    console.error('Error generating OpenAI completion:', error);
  }
}

// Create a function to handle the Q&A loop
function askQuestion() {
  rl.question('\nMasukan pertanyaan anda: ', async (question) => {
    const elasticsearchResults = await getElasticsearchResults(question);
    const contextPrompt = createOpenaiPrompt(elasticsearchResults);
    
    await generateOpenaiCompletion(contextPrompt, question);

    // Prompt the user again after completion
    askQuestion(); // Loop back to asking a new question
  });
}

// Create a readline interface to get the user's question
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Start the question loop
askQuestion();
