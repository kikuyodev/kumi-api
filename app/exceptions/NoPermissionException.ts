import { Exception } from "@adonisjs/core/build/standalone";

export default class NoPermissionException extends Exception {
    public required: string;
    constructor(required: string) {
        super("You do not have the permissions required to do this action.", 403, "E_NO_PERMISSION");

        this.required = required;
    }

    //public async
}
