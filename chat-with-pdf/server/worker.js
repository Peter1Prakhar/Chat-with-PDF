import { Worker } from 'bullmq';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import 'dotenv/config'; // Import dotenv to load environment variables

const worker = new Worker(
  'file-upload-queue',
  async (job) => {
    console.log(`Processing Job:`, job.data);
    const data = job.data; // data is already an object, no need to JSON.parse

    try {
      // Load the PDF
      const loader = new PDFLoader(data.path);
      const rawDocs = await loader.load();
      console.log(`Loaded ${rawDocs.length} raw documents from PDF.`);

      // Chunk the PDF
      const splitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await splitter.splitDocuments(rawDocs);
      console.log(`Split into ${splitDocs.length} chunks.`);

      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
        apiKey: process.env.OPENAI_API_KEY, // Use environment variable for API key
      });

      // Initialize QdrantVectorStore
      // Note: You might want to dynamically create collection names based on the file or user
      // For simplicity, keeping 'langchainjs-testing' for now.
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: 'http://localhost:6333',
          collectionName: 'langchainjs-testing',
        }
      );

      await vectorStore.addDocuments(splitDocs);
      console.log(`All ${splitDocs.length} chunks are added to vector store.`);
    } catch (error) {
      console.error(`Error processing job for file ${data.filename}:`, error);
      throw error; // Re-throw to mark job as failed in BullMQ
    }
  },
  {
    concurrency: 100,
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});