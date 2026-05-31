"use strict";

const AntiNukeMemory = require("../core/antinukeMemory");

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    
    const g = AntiNukeMemory.get(member.guild.id);
    if (g?.enabled && !member.user.bot) {
      try {
        const punished = g.punishedUsers?.get(member.id);
        if (punished) {
          const quarantineRoleId = g.quarantineRoleId;
          if (quarantineRoleId) {
            const role = await member.guild.roles
              .fetch(quarantineRoleId)
              .catch(() => null);

            if (role) {
              await member.roles
                .add(role, "Anti-Nuke: Re-applying punishment on rejoin")
                .catch(() => {});

              for (const r of member.roles.cache.values()) {
                if (r.id === role.id || r.id === member.guild.id) continue;
                await member.roles
                  .remove(r, "Anti-Nuke: Cleaning roles for punished user")
                  .catch(() => {});
              }
            }
          }
          
          return;
        }
      } catch (err) {
        client.logger.error(
          `[ANTINUKE] Error in reapplyPunishment for ${member.guild.id}: ${err}`,
          err,
        );
      }
    }
  });
};
