import type { EventHandler } from 'discord-sucrose';

const handler: EventHandler<'ready'> = async ({ sucrose }) => {
  sucrose.user?.setPresence({ status: 'idle', activities: [{ type: 'WATCHING', name: 'sa communauté' }] });
};

export default handler;
