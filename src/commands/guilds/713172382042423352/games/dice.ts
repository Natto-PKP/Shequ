import type { SubCommand } from 'discord-sucrose';

export default <SubCommand>{
  option: {
    name: 'dice',
    type: 'SUB_COMMAND',
    description: 'Send your dice roll',
    options: [
      {
        name: 'roll',
        type: 'STRING',
        description: 'A dice roll such as 1d6, 1d20, or 1d100',
        required: true,
      },
    ],
  },

  exec: async ({ interaction }) => {
    const roll = interaction.options.getString('roll', true);
    const match = roll.match(/(\d+)d(\d+)/);
    if (!match) return interaction.reply('What you entered does not match the template for a dice roll, for example 1d20');

    const number = Number(match[1]);
    const value = Number(match[2]);

    if (number > 20) return interaction.reply('The number of dice rolls must not exceed 20');
    if (value > 10000) return interaction.reply('The number of dice roll value must not exceed 10,000');

    const throws = Array.from({ length: number }, () => Math.ceil(Math.random() * value));
    const total = throws.reduce((acc, val) => acc + val, 0);

    const head = throws.length > 1 ? `The total result of all dice rolls is **${total}**` : `The result of your dice roll is **${total}**`;
    const body = `\`\`\`${throws.map((val) => `(1d${value} > ${val})`).join(' ')}\`\`\``;

    return interaction.reply(`🎲 \`| \` ${head}${throws.length > 1 ? `\n${body}` : ''}`);
  },
};
