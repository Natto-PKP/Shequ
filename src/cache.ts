import { Logger } from 'discord-sucrose';
import { createClient } from 'redis';

const client = createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` });
// const client = createClient()

client.on('error', Logger.error);

export default client;
