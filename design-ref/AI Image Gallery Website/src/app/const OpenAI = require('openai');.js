const OpenAI = require('openai');

const openai = new OpenAI({
baseURL: 'https://agentrouter.org',
apiKey: 'sk-y8giChAdPOrkMG78BASTlR6NXPcBEsXxuPjeVWO1kiObIY44',
});

async function main() {
const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-opus-5',
  messages: [
    {
      role: 'user',
      content: 'Hello!',
    },
  ],
});

console.log(completion.choices[0].message);
}

main();
