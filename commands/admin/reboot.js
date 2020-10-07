module.exports = {
	controls: {
		name: "reboot",
		permission: 0,
		aliases: ["refresh", "shutdown", "restart"],
		usage: "reboot",
		description: "Reboots the bot by exiting the process",
		enabled: true,
		permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
		dmAvailable: true
	},
	do: async (message, client) => {
		await message.channel.send("Shutting down...");
		console.log(`🔌 ${message.author.tag} (\`${message.author.id}\`) initiated a reboot`);
		return client.shard.respawnAll();
	}
};
