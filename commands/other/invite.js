module.exports = {
	controls: {
		name: "invite",
		permission: 10,
		aliases: ["add"],
		usage: "invite",
		description: "Shows the bot invite link",
		enabled: true
	},
	do: async (message, client) => {
		return message.channel.send(`You can invite **${client.user.username}** using this link: https://discordapp.com/oauth2/authorize?client_id=712011923176030229&scope=bot&permissions=27648`);
	}
};
