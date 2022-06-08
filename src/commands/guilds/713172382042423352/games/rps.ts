import type { SubCommand } from 'discord-sucrose';

export default <SubCommand>{
  option: {
    name: 'rps',
    type: 'SUB_COMMAND',
    description: 'Rock, paper, scissors?',
    options: [
      {
        name: 'choices',
        type: 'STRING',
        description: 'What do you want to play?',
        choices: [
          { name: '🪨 Rock', value: 'rock' },
          { name: '📃 Paper', value: 'paper' },
          { name: '✂️ Scissors', value: 'scissors' },
        ],
        required: true,
      },
    ],
  },

  exec: async ({ interaction }) => {
    const choice = interaction.options.getString('choices', true);
    const revert = ['Rock', 'Paper', 'Scissors'][Math.floor(Math.random() * 3)];

    let win = false;
    if (choice === 'rock' && revert === 'Scissors') win = true;
    if (choice === 'paper' && revert === 'Rock') win = true;
    if (choice === 'scissors' && revert === 'Paper') win = true;

    const message = win ? '🎉 `| ` You won this game !' : `💧 \`| \` You lost, ${interaction.client.user} played ${revert}`;
    await interaction.reply(message);
  },
};
