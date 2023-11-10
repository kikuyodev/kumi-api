import { TestContext, test } from "@japa/runner";
import { join } from "path";

test.group("chart submissions tests", (group) => {
    let loggedIn = false;

    const setName = "MuryokuP - Sweet Sweet Cendrillion Drug (Author).kcs";

    async function loginIfNot({ client }: TestContext) {       
        if (!loggedIn) {
            const res = await client
                .post("/api/v1/accounts/login")
                .fields({
                    username: "Author",
                    password: "password"
                });

            // make sure the login was successful
            res.assertStatus(200);
            console.log(res.cookies());
            
            loggedIn = true;
        }
    }
    
    test("submit a chart", async ({ client }) => {
        // get the .kch file form the filesystem
        const response = await client
            .post("/api/v1/charts/submissions/submit")
            .file("set", join(__dirname, `../files/${setName}`));

            console.log(response.body());
        //response.assertStatus(200);
    }).setup(({ context }) => loginIfNot(context));
});