module.exports = {
    controls: {
        name: "support",
        permission: 10,
        usage: "support",
        description: "Shows the link to the bot's support server",
        enabled: true,
        dmAvailable: true
    },
    do: async (message, client) => {
        return message.channel.send("Need help with the bot? Join https://discord.gg/GGm6YuX for assistance :wink:");
    }
};
