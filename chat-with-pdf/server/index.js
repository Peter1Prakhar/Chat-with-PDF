import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use environment variable for API key
});

const queue = new Queue('file-upload-queue', {
  connection: {
    host: 'localhost',
    port: 6379, // Port should be a number, not a string
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json()); // Add this to parse JSON request bodies

app.get('/', (req, res) => {
  return res.json({ status: 'All Good!' });
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  await queue.add('file-ready', {
    filename: req.file.originalname,
    destination: req.file.destination,
    path: req.file.path,
  });
  return res.json({ message: 'uploaded', filename: req.file.originalname });
});

app.get('/chat', async (req, res) => {
  const userQuery = req.query.message;

  if (!userQuery) {
    return res.status(400).json({ message: 'Message query parameter is required' });
  }

  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY, // Use environment variable for API key
  });

  try {
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: 'http://localhost:6333',
        collectionName: 'langchainjs-testing',
      }
    );
    const ret = vectorStore.asRetriever({
      k: 2,
    });
    const result = await ret.invoke(userQuery);

    const SYSTEM_PROMPT = `
      You are a helpful AI Assistant who answers the user query based on the available context from PDF File.
      If the answer is not available in the context, politely state that you cannot answer based on the provided information.

      Context:
      ${JSON.stringify(result, null, 2)}
      `;

    const chatResult = await client.chat.completions.create({
      model: 'gpt-4o', // Consider using gpt-4o or gpt-3.5-turbo as gpt-4.1 is not a standard model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userQuery.toString() },
      ],
    });

    return res.json({
      message: chatResult.choices[0].message.content,
      docs: result,
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return res.status(500).json({ message: 'Error processing chat request', error: error.message });
  }
});

app.listen(8000, () => console.log(`Server started on PORT:${8000}`));