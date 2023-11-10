import { Exception } from "@adonisjs/core/build/standalone";

export default class SessionRequiredException extends Exception {
    constructor() {
        super("You must be logged in to perform this action.", 401, "E_SESSION_REQUIRED");
    }
}
