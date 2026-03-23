import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { classifyRoute } from './routes/classify.js';
import { chatRoute } from './routes/chat.js';
import globalChatRoute from './routes/global-chat.js';
import n8nRoute from './routes/n8n.js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const server = Fastify({ logger: true });

// Register multipart support for file uploads
server.register(multipart);

// Serve static frontend files
server.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/public/',
});

server.get('/', (req, reply) => {
  return reply.sendFile('index.html');
});

// Register routes
server.register(classifyRoute);
server.register(chatRoute);
server.register(globalChatRoute);
server.register(n8nRoute);

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
