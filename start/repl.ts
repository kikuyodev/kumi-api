/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/
import Repl from "@ioc:Adonis/Addons/Repl";
import Group from "App/models/Group";
import Account from "App/models/Account";

Repl.addMethod(
    "createGroup",
    async (repl, name: string, options?: object) => {
        if (!name) {
            repl.notify("Please provide a name");
            return;
        }

        if (options && typeof options !== "object") {
            repl.notify("Options must be an object");
            return;
        }

        // create group
        repl.notify(`Creating group ${name}...`);

        const group = await Group.create({
            name,
            ...options
        });

        return group;
    },
    { description: "Create a group" }
);

Repl.addMethod(
    "addToGroup",
    async (repl, accountId: number, groupId: number) => {
        if (!accountId || !groupId) {
            repl.notify("Please provide an account ID and a group ID");
            return;
        }

        // add to group
        repl.notify(`Adding account ${accountId} to group ${groupId}...`);

        const group = await Group.find(groupId);
        const account = await Account.find(accountId);

        if (!account) {
            repl.notify(`Account ${accountId} does not exist`);
            return;
        }

        if (!group) {
            repl.notify(`Group ${groupId} does not exist`);
            return;
        }

        await account.related("groups").attach([group.id]);

        return group;
    },
    { description: "Add an account to a group" }
);