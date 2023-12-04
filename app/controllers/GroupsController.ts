import { Exception } from "@adonisjs/core/build/standalone";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Group from "../models/Group";
import WebsocketService from "../services/WebsocketService";
import { Connection } from "../structures/Connection";
import Account from "../models/Account";
import Database from "@ioc:Adonis/Lucid/Database";

export default class GroupsController {
    public async index({ request }: HttpContextContract) {
        const { page } = request.qs();
        const groups = await Group.query().where("visible", true).paginate(page, 25);

        return {
            code: 200,
            data: groups
        }
    }

    public async fetch({ request }: HttpContextContract) {
        const { id } = request.params();
        const group = await Group.find(id);

        if (!group || group.visible === false)
            throw new Exception("This group does not exist.", 404, "E_NOT_FOUND");

        const allUsers = await Database.query().from("account_groups")
            .where("group_id", group.id)
            .select("account_id");

        const userAccounts = await Account.query().whereIn("id", allUsers.map(user => user.account_id)).select("*");

        return {
            code: 200,
            data: {
                group: group.serialize(),
                members: userAccounts
            }
        }
    }

    public async indexGroupsWithMembers({ request }: HttpContextContract) {

        const groupsThatMatter = [
            1, 2, 3, 4, 5
        ];

        const groups = await Group.query().whereIn("id", groupsThatMatter);
    
        const groupsWithMembers = await Promise.all(groups.map(async group => {
            const allUsers = await Database.query().from("account_groups")
                .where("group_id", group.id)
                .select("account_id");
    
            const userAccounts = await Account.query().whereIn("id", allUsers.map(user => user.account_id)).select("*");
    
            return {
                ...group.serialize(),
                members: userAccounts
            }
        });

        return {
            code: 200,
            data: {
                groups: groupsWithMembers
            }
        }
    }
}