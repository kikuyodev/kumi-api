import { AuthorizationContract } from "App/contracts/AuthorizationContract";
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Comment from "../models/Comment";
import { Exception } from "@adonisjs/core/build/standalone";
import { Permissions } from "../util/Constants";
import { DateTime } from "luxon";

export default class CommentsController {
    public async delete({ request, authorization }: HttpContextContract) {

    }

    public static async deleteComment(comment: Comment, authorization: AuthorizationContract) {
        if (!authorization.account?.has(Permissions.MODERATE_COMMENTS) || comment.authorId !== authorization.account.id) {
            throw new Exception("You do not have permission to delete this comment.", 403, "E_NO_PERMISSION");
        }

        comment.deletedAt = DateTime.now();

        if (comment.authorId === comment.editorId) {
            comment.editorId = authorization.account.id;
        }

        await comment.save();

        return {
            code: 200,
            data: {
                comment: comment.serialize()
            }
        };
    }

    public static async modifyComment(comment: Comment, authorization: AuthorizationContract, message: string) {
        if (!authorization.account?.has(Permissions.MODERATE_COMMENTS) || comment.authorId !== authorization.account.id) {
            throw new Exception("You do not have permission to modify this comment.", 403, "E_NO_PERMISSION");
        }
    
        comment.message = message;
        comment.updatedAt = DateTime.now();

        if (comment.authorId === comment.editorId) {
            comment.editorId = authorization.account.id;
        }

        await comment.save();
        await comment.refresh();

        return {
            code: 200,
            data: {
                comment: comment.serialize()
            }
        };
    }
}