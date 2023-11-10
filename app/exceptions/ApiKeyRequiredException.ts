import { Exception } from "@adonisjs/core/build/standalone";

export default class ApiKeyRequiredException extends Exception {
    constructor() {
        super("This endpoint requires an API key to be provided.", 401, "E_API_KEY_REQUIRED");
    }
}

