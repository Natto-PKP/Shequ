import { Logger } from 'discord-sucrose';
import { createClient } from 'redis';

const client = createClient();

client.on('error', Logger.error);

export default client;
