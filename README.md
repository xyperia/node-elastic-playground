# Elasticsearch to OpenAI Integration

This Node.js application integrates Elasticsearch and OpenAI, allowing users to query an Elasticsearch index, retrieve results, and generate responses from OpenAI's GPT-3.5-turbo model. The OpenAI responses are streamed token-by-token for a real-time experience.

## Features

- Fetches relevant data from Elasticsearch based on user queries.
- Generates contextual prompts from the retrieved Elasticsearch data.
- Streams responses from OpenAI's GPT-3.5-turbo model, token-by-token.
- Continuously prompts for new user questions after each OpenAI response.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed. You can download it [here](https://nodejs.org/).
- **Elasticsearch**: You need access to an Elasticsearch instance.
- **OpenAI API Key**: You need an API key from OpenAI.

## Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/xyperia/node-elastic-playground.git
    cd node-elastic-playground
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the root of your project and add the following environment variables:
    ```bash
    ES_ENDPOINT=your_elasticsearch_endpoint
    ES_API_KEY=your_elasticsearch_api_key
    OPENAI_API_KEY=your_openai_api_key
    ```

4. Start the application:
    ```bash
    node app.js
    ```

## Usage

- After starting the application, it will prompt you to input a question.
- The application will query Elasticsearch, retrieve relevant data, and then generate a response from OpenAI.
- The OpenAI response will be streamed in real-time, token-by-token, for a smooth conversational experience.
- After the response is complete, you can input another question.

## Example

Please enter your question: What are the general rules?

Token-by-token response from OpenAI: The general rules are as follows: [content from Elasticsearch] ...

## Dependencies

- [Elasticsearch Node.js Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [OpenAI Node.js Client](https://github.com/openai/openai-node)
- [dotenv](https://www.npmjs.com/package/dotenv)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
