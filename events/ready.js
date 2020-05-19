const { log_hooks } = require("../config.json");
module.exports = async (Discord, client) => {
	(new Discord.WebhookClient(log_hooks.core.id, log_hooks.core.token)).send(`:ok: Started with ${client.guilds.cache.size} servers`);
	console.log(`Logged in as ${client.user.tag}!`);
};
