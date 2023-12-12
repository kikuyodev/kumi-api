import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Env from "@ioc:Adonis/Core/Env";
import Account from "../models/Account"; import Hash from "@ioc:Adonis/Core/Hash";
import Session from "../models/Session";
import fernet from "fernet";

export enum AuthorizationType {
    Web,
    Api
}

export class AuthorizationContract {
    public account: Account;
    public type: AuthorizationType = AuthorizationType.Web;
    public checked: boolean = false;
    public authorized: boolean = false;
    public token: fernet.Token = new fernet.Token({
        secret: new fernet.Secret(encodeURIComponent(Env.get("SESSION_SECRET"))),
        time: Date.now(),
        iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    });

    constructor(private ctx: HttpContextContract) { }

    public async verify() {
        // get token from cookie
        const token = this.ctx.request.plainCookie("KUMI-SESSION");
        const auth = this.ctx.request.header("Authorization");

        this.checked = true;

        if (!token && !auth)
            return false;


        if (token) {
            const session = await Session.findBy("token", token);

            if (!session)
                return false;

            try {
                const tkn = new fernet.Token({
                    secret: new fernet.Secret(encodeURIComponent(Env.get("SESSION_SECRET"))),
                    token: session.token,
                    ttl: 0
                });

                const decoded = JSON.parse(tkn.decode());
                console.log(decoded);

                if (decoded.ip !== this.ctx.request.ip())
                    return false;

                this.account = (await Account.find(decoded.id))!;
                this.type = AuthorizationType.Web;

                this.authorized = true;
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        } else if (auth) {
            const [type, token] = auth.split(" ");

            if (type === "Session") {
                const session = await Session.findBy("token", token);

                if (!session)
                    return false;

                try {
                    const tkn = new fernet.Token({
                        secret: new fernet.Secret(encodeURIComponent(Env.get("SESSION_SECRET"))),
                        token: session.token,
                        ttl: 0
                    });

                    const decoded = JSON.parse(tkn.decode());


                    if (decoded.ip !== this.ctx.request.ip())
                        return false;

                    this.account = (await Account.find(decoded.id))!;
                    this.type = AuthorizationType.Web;

                    this.authorized = true;
                    return true;
                } catch (e) {
                    return false;
                }
            } else {
                // TODO: implement api token authorization
            }
        }

        return false;
    }

    public async login(query: string, password: string) {
        const account = await Account
            .query()
            .where("username", query)
            .orWhere("email", query)
            .first();

        this.checked = true;

        if (!account)
            return this.ctx.response.unauthorized({
                code: 401,
                message: "Invalid credentials"
            });

        if (!await Hash.verify(account.password, password))
            return this.ctx.response.unauthorized({
                code: 401,
                message: "Invalid credentials"
            });

        this.account = account;

        const session = await Session.create({
            accountId: account.id,
            token: this.token.encode(JSON.stringify({
                id: account.id,
                ip: this.ctx.request.ip(),
                time: Date.now()
            }))
        });

        this.ctx.response.plainCookie("KUMI-SESSION", session.token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/"
        });

        this.authorized = true;

        return {
            code: 200,
            data: {
                token: session.token,
                account: account.serialize()
            }
        };
    }
}