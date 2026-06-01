const {
    ContainerBuilder,
    MessageFlags,
    PermissionsBitField,
    SeparatorBuilder,
    TextDisplayBuilder,
} = require("discord.js");

const AntiNukeMemory = require("../../core/antinukeMemory");

const IMPORTANT_PERMISSIONS = [
    "Administrator",
    "ManageGuild",
    "ManageRoles",
    "ManageChannels",
    "ManageWebhooks",
    "BanMembers",
    "KickMembers",
    "ModerateMembers",
    "ManageMessages",
    "MentionEveryone",
    "ManageNicknames",
    "ManageEmojisAndStickers",
    "ManageEvents",
];

function prettyPermission(permission) {
    return permission.replace(/([A-Z])/g, " $1").trim();
}

function resolveUserId(message, args) {
    const input = args[0]?.toLowerCase() === "user" ? args[1] : args[0];
    return message.mentions.users.first()?.id || input?.replace(/[<@!>]/g, "") || null;
}

module.exports = {
    name: "inspect",
    aliases: ["inspectuser", "userinspect"],
    category: "mod",
    premium: false,

    run: async (client, message, args) => {
        if (!message.guild) return;

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return client.util.container(
                message,
                "# Access Denied\n-# You need Administrator permission to use this command.",
            );
        }

        const userId = resolveUserId(message, args);
        if (!userId) {
            return client.util.container(
                message,
                `# Inspect User\n-# Usage: \`${message.guild.prefix || "&"}inspect user @user\``,
            );
        }

        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            return client.util.container(
                message,
                "# User Not Found\n-# Provide a valid server member.",
            );
        }

        const g = AntiNukeMemory.get(message.guild.id);
        const permissions = member.permissions.toArray();
        const important = IMPORTANT_PERMISSIONS.filter((permission) =>
            member.permissions.has(permission),
        );
        const other = permissions.filter((permission) => !IMPORTANT_PERMISSIONS.includes(permission));
        const roles = member.roles.cache
            .filter((role) => role.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map((role) => role.toString());

        const lines = [
            "## User Inspect",
            `**User**: ${member.user.tag} | \`${member.id}\``,
            `**Joined**: ${member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown"}`,
            `**Top Role**: ${member.roles.highest?.id === message.guild.id ? "None" : member.roles.highest}`,
            "",
            "**Important Permissions**",
            important.length ? important.map((permission) => `- ${prettyPermission(permission)}`).join("\n") : "None",
        ];

        if (other.length) {
            lines.push("", "**Other Permissions**", other.map((permission) => `- ${prettyPermission(permission)}`).join("\n"));
        }

        if (roles.length) {
            lines.push("", "**Roles**", roles.slice(0, 20).join(", "));
            if (roles.length > 20) lines.push(`-# and ${roles.length - 20} more`);
        }

        if (g?.whitelist?.has(member.id)) {
            const allowed = g.whitelist.get(member.id) || [];
            lines.push("", "**Whitelisted**", allowed.length ? allowed.map((permission) => `- ${permission}`).join("\n") : "All configured bypasses");
        }

        if (g?.extraOwners?.has(member.id)) {
            lines.push("", "**Extra Owner**", "Yes");
        }

        if (g?.punishedUsers?.has(member.id) || (g?.quarantineRoleId && member.roles.cache.has(g.quarantineRoleId))) {
            const punished = g.punishedUsers.get(member.id);
            lines.push("", "**Quarantine**", punished?.reason || "Active");
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "-# Effective permissions are calculated from this member's server roles.",
                ),
            );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { repliedUser: true },
        });
    },
};
