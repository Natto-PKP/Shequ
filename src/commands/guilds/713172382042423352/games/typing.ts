import randomWords from 'random-words';
import { createCanvas } from 'canvas';

import type { Options as RandomWordsOptions } from 'random-words';
import type { SubCommand } from 'discord-sucrose';
import type { GuildMember, TextChannel } from 'discord.js';

import cache from '../../../../cache';

import { fontFamilies } from '../../../../functions/canvas';
import { colors } from '../../../../config';

/**
 * Print a word in a png file
 */
const wordImage = (word: string) => {
  const canvas = createCanvas(0, 80);
  const font = `32px "${fontFamilies}"`;
  const ctx = canvas.getContext('2d');

  ctx.font = font;
  const measureWord = ctx.measureText(word);
  canvas.width = measureWord.width + 40 < 300 ? 300 : measureWord.width + 40;

  ctx.beginPath();
  ctx.fillStyle = colors.darkGrey;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.closePath();

  ctx.beginPath();
  ctx.font = font;
  ctx.fillStyle = colors.lightBlue;
  ctx.fillText(word, canvas.width / 2 - measureWord.width / 2, canvas.height / 2 + 32 / 4);
  ctx.closePath();

  return canvas;
};

export default <SubCommand>{
  permissions: { private: false },

  option: {
    name: 'typing',
    type: 'SUB_COMMAND',
    description: 'Tap faster than your opponents',

    options: [
      {
        name: 'channel',
        type: 'CHANNEL',
        channelTypes: ['GUILD_TEXT', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'],
        description: 'Choose the channel where the game will take place',
      },
      {
        name: 'rounds',
        type: 'NUMBER',
        minValue: 3,
        maxValue: 20,
        description: 'The number of game turns (default 5)',
      },
      {
        name: 'interval',
        type: 'NUMBER',
        minValue: 5,
        maxValue: 30,
        description: 'Number of seconds a round takes',
      },
      {
        name: 'difficulty',
        type: 'STRING',
        description: 'Select your difficulty level',
        choices: [
          { name: 'Easy', value: 'easy' },
          { name: 'Intermediate', value: 'intermediate' },
          { name: 'Hard', value: 'hard' },
          { name: 'Extreme', value: 'extreme' },
        ],
      },
    ],
  },

  exec: async ({ interaction }) => {
    /**
    * ? GET OPTIONS
    */
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (!channel || !('send' in channel)) return interaction.reply('Select a text room to play');
    const difficulty = interaction.options.getString('difficulty') || 'intermediate';
    const rounds = interaction.options.getNumber('rounds') || 5;
    const roundTime = interaction.options.getNumber('interval') || 10;

    try {
      if (await cache.get(`games_typing_${channel.id}`)) return await interaction.reply(`A game is already taking place in the ${channel} channel`);
      await cache.set(`games_typing_${channel.id}`, interaction.user.id);

      const roundUnplayedLimit = 3;
      const players = <GuildMember[]>[];

      /**
      * ? WAITING
      */
      let waitingTimeout = 12e4;

      // Generate embed
      const waitingEmbed = () => ({
        color: colors.lightBlue,
        description: `🖊️ \`| \` ${interaction.member} wishes to be part of the one who will write the fastest`,
        fields: [
          { name: '\u200b', value: `${players.length} players / 20`, inline: true },
          { name: '\u200b', value: `Play in ${channel}`, inline: true },
        ],
        footer: { text: `${rounds} rounds (${roundTime} seconds) \u2022 mode ${difficulty} \u2022 ${waitingTimeout / 1000} more seconds of waiting` },
      });

      // Interaction reply - Waiting menu
      const waitingMessage = await interaction.reply({
        embeds: [waitingEmbed()],
        components: [{
          type: 'ACTION_ROW',
          components: [
            {
              customId: 'game-typing-enter',
              type: 'BUTTON',
              emoji: '👋',
              label: 'I will join',
              style: 'SUCCESS',
            },
            {
              customId: 'game-typing-leave',
              type: 'BUTTON',
              label: 'I have to go',
              style: 'DANGER',
            },
          ],
        }],
        fetchReply: true,
      });

      if (waitingMessage.type !== 'APPLICATION_COMMAND') throw TypeError('message is not an application command');

      // Waiting collector for players
      const waitingCollector = waitingMessage.createMessageComponentCollector({
        componentType: 'BUTTON',
        filter: (i) => !i.user.bot,
        time: waitingTimeout,
      });

      // Interval for menu update
      const waitingInterval = setInterval(async () => {
        waitingTimeout -= 5e3;
        await waitingMessage.edit({ embeds: [waitingEmbed()] }).catch(() => null);
      }, 5e3);

      waitingCollector.on('collect', (i) => {
        const member = <GuildMember>i.member;
        const exist = players.some(({ id }) => member.id === id);

        if (i.customId === 'game-typing-enter') {
          if (!exist) {
            players.push(member);
            i.reply({ content: 'You have just entered the list of players', ephemeral: true });
            if (players.length === 20) waitingCollector.stop();
          } else i.reply({ content: 'You are already in the list of players', ephemeral: true });
        } else if (i.customId === 'game-typing-leave') {
          if (exist) {
            const index = players.findIndex(({ id }) => member.id === id);
            players.splice(index, 1);
            i.reply({ content: 'You have just left the player list', ephemeral: true });
          } else i.reply({ content: 'You are not already in the game', ephemeral: true });
        }
      });

      await new Promise((resolve) => { waitingCollector.on('end', resolve); });
      clearInterval(waitingInterval);

      if (players.length < 2) {
        await cache.del(`games_typing_${channel.id}`);
        return await waitingMessage.edit({ content: 'Unfortunately, there are not enough players to start the game', components: [] });
      }

      // ? Departure
      const majority = Math.ceil(players.length * 0.8);
      const readyPlayers = <GuildMember[]>[];
      let departureTimeout = 12e4;

      // Generate content
      const departureContent = () => ({
        embeds: [{
          color: colors.lightBlue,
          description: '🏁 `| ` The game will start when the majority of players are ready',
          fields: [{ name: '\u200b', value: `${readyPlayers.length} players / ${majority}`, inline: true }],
          footer: { text: `${rounds} rounds (${roundTime} seconds) \u2022 mode ${difficulty} \u2022 ${departureTimeout / 1000} more seconds of waiting` },
        }],
        components: [{
          type: 'ACTION_ROW',
          components: [{
            customId: 'game-typing-ready',
            type: 'BUTTON',
            emoji: '✔️',
            label: "I'm ready!",
            style: 'SUCCESS',
          }],
        }],
      });

      const currentChannel = <TextChannel>interaction.channel;
      const sameChannel = channel.id === currentChannel.id;
      const departureMessage = await (sameChannel
        ? waitingMessage.edit(<never>departureContent())
        : channel.send(<never>departureContent()));

      if (!departureMessage) {
        await cache.del(`games_typing_${channel.id}`);
        return await currentChannel.send('A problem occurred while sending the game launch message');
      }

      // Departure collector for ready players
      const departureCollector = departureMessage.createMessageComponentCollector({
        componentType: 'BUTTON',
        filter: ({ user: { id } }) => players.some((player) => player.id === id),
        time: 12e4,
      });

      // Departure menu update
      const departureInterval = setInterval(async () => {
        departureTimeout -= 5e3;
        await departureMessage.edit(<never>departureContent()).catch(() => null);
      }, 5e3);

      departureCollector.on('collect', (i) => {
        readyPlayers.push(<GuildMember>i.member);
        if (readyPlayers.length >= majority) departureCollector.stop();
      });

      await new Promise((resolve) => { departureCollector.on('end', resolve); });
      clearInterval(departureInterval);

      if (readyPlayers.length < majority) {
        await cache.del(`games_typing_${channel.id}`);
        return await channel.send('Not enough players were close at launch, so the game is canceled');
      }

      // ? Game start
      await departureMessage.edit({
        embeds: [{
          color: colors.lightBlue,
          description: '⌨️ `| `The game begins, all to your keyboards!',
          fields: [
            { name: '\u200b', value: `${readyPlayers.length} players`, inline: true },
            { name: '\u200b', value: `${rounds} rounds`, inline: true },
          ],
          footer: { text: `${rounds} rounds (${roundTime} seconds) \u2022 mode ${difficulty}` },
        }],
        components: [],
      });

      let wordGeneratorOptions = <RandomWordsOptions>{ exactly: rounds };
      if (difficulty === 'easy') wordGeneratorOptions = { ...wordGeneratorOptions, maxLength: 5 };
      if (difficulty === 'intermediate') wordGeneratorOptions = { ...wordGeneratorOptions };
      if (difficulty === 'hard') wordGeneratorOptions = { ...wordGeneratorOptions, wordsPerString: 2 };
      if (difficulty === 'extreme') wordGeneratorOptions = { ...wordGeneratorOptions, wordsPerString: 4 };

      const words = randomWords(wordGeneratorOptions);
      const scores = <{ player: GuildMember, words: string[] }[]>[];
      let roundUnplayed = 0;

      // ? Rounds
      // eslint-disable-next-line no-restricted-syntax
      for await (const word of words) {
        const index = words.indexOf(word);
        const image = wordImage(word);
        let roundTimeout = roundTime * 1000;

        // Generate embed
        const roundEmbed = () => ({
          color: colors.lightBlue,
          description: 'Write this word as soon as possible:',
          image: { url: 'attachment://answer.png' },
          footer: { text: `${index + 1} rounds / ${rounds} \u2022 ${roundTimeout / 1000} seconds left` },
        });

        const roundMessage = await channel.send({
          embeds: [roundEmbed()],
          files: [{ attachment: image.toBuffer(), name: 'answer.png' }],
        });

        // Answer message collector
        const answerCollector = channel.createMessageCollector({
          filter: (msg) => players.some(({ id }) => id === msg.author.id),
          time: 10000,
        });

        // Round message update
        const roundInterval = setInterval(async () => {
          roundTimeout -= 5e3;
          await roundMessage.edit(<never>roundEmbed()).catch(() => null);
        }, 5e3);

        let winner: GuildMember | null = null;
        answerCollector.on('collect', (msg) => {
          if (word.toLowerCase() === msg.content.trim().toLowerCase()) {
            winner = msg.member;
            answerCollector.stop();
          }
        });

        await new Promise((resolve) => { answerCollector.on('end', resolve); });
        clearInterval(roundInterval);

        if (winner) {
          roundUnplayed = 0;
          const scoreIndex = scores.findIndex(
            ({ player }) => player.id === (<GuildMember>winner).id,
          );

          if (scoreIndex >= 0) scores[scoreIndex].words.push(word);
          else scores.push({ player: winner, words: [word] });

          await roundMessage.edit({
            embeds: [{
              color: colors.green,
              description: `${winner} is the one who wrote **${word}** the fastest`,
              image: { url: 'attachment://answer.png' },
              footer: { text: `${index + 1} rounds / ${rounds}` },
            }],
          });
        } else {
          roundUnplayed += 1;

          await roundMessage.edit({
            embeds: [{
              color: colors.lightBlue,
              description: 'No player was able to write the word in time',
              image: { url: 'attachment://answer.png' },
              footer: { text: `${index + 1} rounds / ${rounds}` },
            }],
          });
        }

        if (roundUnplayed >= roundUnplayedLimit) break;
      }

      if (roundUnplayed >= roundUnplayedLimit) {
        await cache.del(`games_typing_${channel.id}`);
        return await channel.send({ embeds: [{ color: colors.lightBlue, description: 'The game has been canceled because no one is participating anymore.' }] });
      }

      const ranking = players.map((player) => {
        const score = scores.find((s) => s.player.id === player.id) || { player, words: [] };
        return score;
      }).sort((a, b) => b.words.length - a.words.length);

      await channel.send({
        embeds: [{
          color: colors.lightBlue,
          description: ranking.map((score, i) => `\`${`${i + 1}.`.padEnd(2)}\` ${score.words.length.toString().padEnd(2)} - ${score.player}`).join('\n'),
          footer: { text: `${rounds} rounds \u2022 mode ${difficulty}` },
        }],
      });

      return await cache.del(`games_typing_${channel.id}`);
    } catch (error) {
      await cache.del(`games_typing_${channel.id}`);
      throw error;
    }
  },
};
