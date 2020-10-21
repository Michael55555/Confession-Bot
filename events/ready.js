const { log_hooks } = require("../config.json");
const { dbQueryAll, dbModify } = require("../coreFunctions");
module.exports = async (Discord, client) => {
	(new Discord.WebhookClient(log_hooks.core.id, log_hooks.core.token)).send(`:ok: Started with ${client.guilds.cache.size} servers (Shard: ${client.shard.ids[0]})`);
	console.log(`Logged in as ${client.user.tag}! (Shard: ${client.shard.ids[0]})`);
	if (client.guilds.cache.get("704005798837092473")) {
		let premiumServers = await dbQueryAll("Server", {premium: true});
		premiumServers.forEach(s => {
			if (s.premium_rep) {
				(async function () {
					async function rmPremium() {
						s.premium = false;
						s.premium_rep = "";
						s.config.channels.logs = "";
						await dbModify("Server", {id: s.id}, s);
						console.log("premium removed", s.id);
					}

					await client.guilds.cache.get("704005798837092473").members.fetch(s.premium_rep).then(async m => {
						if (!m || (!m.roles.cache.has("708142308184293487") && !m.roles.cache.has("746844013738328144"))) await rmPremium();
					}).catch(async () => {
						await rmPremium();
					});

				})();
			}
		});
	}

	client.setInterval(async function() {
		if ((process.memoryUsage().heapUsed).toFixed(2) > 314572800) {
			(new Discord.WebhookClient(log_hooks.core.id, log_hooks.core.token)).send(`🎛️ Rebooting shard ${client.shard.ids[0]} due to memory usage`, client);
			setTimeout(function() {
				process.exit();
			}, 1000);
		}
	}, 60000); //Memory management every 30 minutes
};
