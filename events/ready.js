const { log_hooks } = require("../config.json");
const { dbQueryAll, dbModify } = require("../coreFunctions");
module.exports = async (Discord, client) => {
	(new Discord.WebhookClient(log_hooks.core.id, log_hooks.core.token)).send(`:ok: Started with ${client.guilds.cache.size} servers`);
	console.log(`Logged in as ${client.user.tag}!`);
	let premiumServers = await dbQueryAll("Server", {premium: true});
	premiumServers.forEach(s => {
		if (s.premium_rep) {
			(async function() {
				async function rmPremium() {
					s.premium = false;
					s.premium_rep = "";
					s.config.channels.logs = "";
					await dbModify("Server", { id: s.id }, s);
					console.log("premium removed", s.id);
				}
				await client.guilds.cache.get("704005798837092473").members.fetch(s.premium_rep).then(async m => {
					if (!m || !m.roles.cache.has("708142308184293487")) await rmPremium();
				}).catch(async () => {
					await rmPremium();
				});

			})();
		}
	});
};
