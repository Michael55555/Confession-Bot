const { log_hooks, developer, main_guild, global_mod, trial_mod } = require("./config.json");
const Discord = require("discord.js");
let models = require("./utils/schemas");
const { promises } = require("fs");
const { resolve } = require("path");

module.exports = {
	/**
	 * Returns permission level of inputted ID
	 *
	 * 11 - Blacklisted\
	 * 10 - Everyone
	 * 3 - Server staff
	 * 2 - Server Admin
	 * 1 - Global Permissions
	 * 0 - Developer/Global Admin
	 *
	 * @param member - Member object fetched from a server
	 * @param client - The Discord client
	 * @returns {Promise<number>}
	 */
	checkPermissions: async (member, client) => {
		if (!member || !member.id || !client) return 10;
		if (developer.includes(member.id)) return 0;
		if (client.guilds.cache.get(main_guild) && client.guilds.cache.get(main_guild).roles.cache.get(global_mod) && client.guilds.cache.get(main_guild).roles.cache.get(global_mod).members.has(member.id)) return 1;
		if (client.guilds.cache.get(main_guild) && client.guilds.cache.get(main_guild).roles.cache.get(global_mod) && client.guilds.cache.get(main_guild).roles.cache.get(trial_mod).members.has(member.id)) return 2;
		if ((await module.exports.dbQuery("User", { id: member.id })).blocked) return 11;
		if (member.guild && (member.permissions.has("KICK_MEMBERS") || member.permissions.has("BAN_MEMBERS"))) return 3;
		return 10;
	},
	permLevelToRole: (permLevel) => {
		switch (permLevel) {
		case -1:
			return "No Users";
		case 0:
			return "Bot Administrator";
		case 1:
			return "Global Moderator";
		case 2:
			return "Trial Global Moderator";
		case 3:
			return "Server Staff";
		case 10:
			return "All Users";
		default:
			return "Undefined";
		}
	},
	channelPermissions: (permissionCheckFor, channel, client) => {
		const permissionNames = require("./utils/permissions.json");
		let permissionCheckArr = [];
		switch (permissionCheckFor) {
		case "viewsendembed":
			permissionCheckArr = ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"];
			break;
		default:
			permissionCheckArr = permissionCheckFor;
		}
		let channelPermissions = channel.permissionsFor(client.user.id);
		let missing = permissionCheckArr.filter(p => !channelPermissions.has(p)).map(p => permissionNames[p]);
		if (missing.length < 1) return null;

		return `I am missing some permissions in <#${channel.id}> that are required for this to function correctly:\n- ${missing.join("\n- ")}\n\nYou can fix this by going to the channel settings for <#${channel.id}> and ensuring **${client.user.username}** has a :white_check_mark: for the above permissions.`;
	},
	errorLog: (err, type, footer) => {
		if (!err) return;
		let errorText = "Error Not Set";
		if (err.stack) {
			console.error((require("chalk")).red(err.stack));
			errorText = err.stack;
		} else if (err.error) {
			console.error((require("chalk")).red(err.error));
			errorText = err.error;
		} else return;
		let embed = new Discord.MessageEmbed()
			.setAuthor(type)
			.setTitle(err.message ? err.message.substring(0, 256) : "No Message Value")
			.setDescription(`\`\`\`js\n${(errorText).length >= 1000 ? (errorText).substring(0, 1000) + " content too long..." : err.stack}\`\`\``)
			.setColor("DARK_RED")
			.setTimestamp()
			.setFooter(footer);

		let hook = new Discord.WebhookClient(log_hooks.core.id, log_hooks.core.token);
		hook.send(embed);
	},
	/**
	 * Fetch a user
	 * @param {string} id - The Discord ID of the user
	 * @param {module:"discord.js".Client} client - The bot client
	 * @returns {Collection}
	 */
	async fetchUser(id, client) {
		if (!id) return null;
		let foundId;
		let matches = id.match(/^<@!?(\d+)>$/);
		if (!matches) foundId = id;
		else foundId = matches[1];

		function fetchUnknownUser(uid) {
			return client.users.fetch(uid, true)
				.then(() => {
					return client.users.cache.get(uid);
				})
				.catch(() => {
					return null;
				});
		}

		return client.users.cache.get(foundId)
			|| fetchUnknownUser(foundId)
			|| null;
	},
	/**
	 * Search the database for an id, creates a new entry if not found
	 * @param {string} collection - The collection to query.
	 * @param  {Object} query - The term to search for
	 * @returns {Object}
	 */
	dbQuery: async (collection, query) => {
		return await models[collection].findOne(
			query
		)
			.then((res) => {
				if (!res) {
					return new models[collection](
						query
					).save();
				}
				return res;
			}).catch((error) => {
				console.log(error);
			});
	},
	/**
	 * Search the database for some parameters and return all entries that match, does not create a new entry if not found
	 * @param {string} collection - The collection to query.
	 * @param  {Object} query - The term to search for
	 * @returns {Object}
	 */
	dbQueryAll: async (collection, query) => {
		return await models[collection].find(
			query
		)
			.then((res) => {
				if (!res) {
					return null;
				} else {
					return res;
				}
			}).catch((error) => {
				console.log(error);
			});
	},
	/**
	 * Search the database for some parameters, returns one entry and does not create a new entry if not found
	 * @param {string} collection - The collection to query.
	 * @param  {Object} query - The term to search for
	 * @returns {Object}
	 */
	dbQueryNoNew: async (collection, query) => {
		if (!models[collection]) return 0;
		return await models[collection].findOne(
			query
		)
			.then((res) => {
				if (!res) {
					return null;
				} else {
					return res;
				}
			}).catch((error) => {
				console.log(error);
			});
	},
	/**
	 * Modify the database by providing either the userId or serverId
	 * @param {string} collection - Who should be modified, user or server.
	 * @param  {Snowflake | string} id - The id of the user/server
	 * @param {Object} modify - Should the user/server be blocked or unblocked
	 * @returns {Object}
	 */
	dbModifyId: async (collection, id, modify) => {
		modify.id = id;
		return await models[collection].findOne({
			id: id
		})
			.then(async (res) => {
				if (!res) {
					return new models[collection](
						modify
					).save();
				}
				await res.update(modify);
				return res;
			});
	},
	/**
	 * Modify the database by providing either the userId or serverId.
	 *
	 * *Note: Does not create new if not found.*
	 * @param {string} collection - Who should be modified, user or server.
	 * @param {Object} term - Which to modify
	 * @param {Object} query - Which to modify
	 * @param {Object} modify - What to change it to
	 * @returns {Promise}
	 */
	dbModify(collection, query, modify) {
		return models[collection].findOneAndUpdate(query, modify)
			.then((res) => {
				return res;
			});
	},
	/**
	 * Delete one document
	 * @param {string} collection - Which collection the document is in
	 * @param {Object} query - Which to delete
	 * @returns {Promise<void>}
	 */
	dbDeleteOne: async (collection, query) => {
		return await models[collection].findOne(
			query
		)
			.then(async (res) => {
				if (!res) return undefined;
				await res.deleteOne();
				return res;
			});
	},
	/**
	 * Paginate a message
	 * @param {Message} message Discord.js Messsage object
	 * @param {string[] | MessageEmbed[]} content The text to paginate
	 * @param {PageOptions} [options] Options for pagination
	 * @param {object} [options.emojis] Emojis to use for controls
	 * @param {string} [options.emojis.left='⬅'] The emoji used for going to the previous page
	 * @param {string} [options.emojis.end='⏹'] The emoji used for deleting the message
	 * @param {string} [options.emojis.right='➡'] The emoji used for going to the next page
	 * @param {number} [options.time=300000] How long to 'watch' for reactions
	 * @param {number} [options.startPage=0] Which page to start on (counting starts at 0)
	 * @param {boolean} [options.removeReaction=true] Remove user's reaction (note: the bot must have `MANAGE_MESSAGES`)
	 * @param {boolean} [options.hideControlsSinglePage=true] Hide the controls if there is only one page
	 * @param {boolean} [options.timeoutRemoveReactions=true] Remove the reactions after the time expires
	 * @returns {Promise<void>}
	 * @example
	 * const content: string[] = ['First page', 'Second page', 'Third page']
	 *
	 * const options: PageOptions = {
	 *   time: 150000,
	 *   startPage: 2
	 * }
	 *
	 * pages(locale, message, content, options)
	 */
	pages: async function (message, content, options = {
		time: 300000,
		startPage: 0,
		hideControlsSinglePage: true,
		timeoutRemoveReactions: true,
		removeReaction: true
	}) {
		if (!(content instanceof Array)) throw new TypeError("Content is not an array");
		if (!content.length) throw new Error("Content array is empty");
		let removeReaction = options.removeReaction;

		if (message.channel.type === "dm" || !message.channel.permissionsFor(message.client.user.id).has("MANAGE_MESSAGES")) removeReaction = false;

		const emojis = {
			left: "⬅️",
			end: "⏹️",
			right: "➡️"
		};

		const time = options.time;
		const hideControlsSinglePage = options.hideControlsSinglePage;

		if (hideControlsSinglePage && content.length === 1) {
			await message.channel.send(content instanceof Discord.MessageEmbed ? { embed: content[0] } : content[0]);
			return;
		}
		const filter = (reaction, user) => (Object.values(emojis).includes(reaction.emoji.name) || Object.values(emojis).includes(reaction.emoji.id)) && !user.bot && user.id === message.author.id;

		let page = options.startPage;
		content[page].author.name = content[page].author.name.replace("{{current}}", page+1).replace("{{total}}", content.length.toString());
		const msg = await message.channel.send(content[page] instanceof Discord.MessageEmbed ? { embed: content[page] } : content[page]);

		for (const emoji in emojis) await msg.react(emojis[emoji]);

		const collector = msg.createReactionCollector(filter, { time: time });
		collector.on("collect", ({ users, emoji: { id, name } }, user) => {
			if (emojis.left && (id === emojis.left || name === emojis.left)) {
				page = page > 0 ? page - 1 : content.length - 1;
				if (removeReaction) users.remove(user.id);
			}
			else if (emojis.right && (id === emojis.right || name === emojis.right)) {
				page = page + 1 < content.length ? page + 1 : 0;
				if (removeReaction) users.remove(user.id);
			}
			else if (emojis.end && (id === emojis.end || name === emojis.end)) {
				msg.edit("*Closed*", {embed: null});
				collector.stop();
				return;
			}
			if (msg) {
				content[page].author.name = content[page].author.name.replace("{{current}}", page+1).replace("{{total}}", content.length.toString());
				if (content[page] instanceof Discord.MessageEmbed) msg.edit({ embed: content[page] });
				else msg.edit(content[page]);
			}
		});
		collector.on("end", () => {
			msg.reactions.removeAll();
		});
	}
};
/**
 * Like readdir but recursive 👀
 * @param {string} dir
 * @returns {Promise<string[]>} - Array of paths
 */
const fileLoader = async function* (dir) {
	const files = await promises.readdir(dir, { withFileTypes: true });
	for (let file of files) {
		const res = resolve(dir, file.name);
		if (file.isDirectory()) {
			yield* fileLoader(res);
		} else {
			yield res;
		}
	}
};

module.exports.fileLoader = fileLoader;
