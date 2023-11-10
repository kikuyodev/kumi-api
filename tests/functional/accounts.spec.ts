import { test } from "@japa/runner";
import Account from "App/models/Account";

test.group("account tests", (group) => {
    let dummyAccount: Account;

    test("create an account", async ({ client, assert }) => {
        const response = await client
            .post("/api/v1/accounts")
            .fields({
                username: "_test_dummy_account_create",
                password: "test_password12345",
                email: "test@email.com",
            });
    
        // assert that the response has a 201 status code
        response.assertStatus(201);
    
        // assert that the response body matches the following
        response.assertBodyContains({
            data: {
                username: "_test_dummy_account_create"
            }
        });

        // get the account from the database and store it in the account variable
        dummyAccount = await Account.findByOrFail("id", response.body().data.id);

        // assert that the password is hashed
        assert.notEqual(dummyAccount.password, "test_password12345");
    }).setup(async () => {
        // delete the dummy account from the database if it exists
        const existingDummyAccount = await Account.findBy("username", "_test_dummy_account_create");

        if (existingDummyAccount) {
            await existingDummyAccount.delete();
        }
    });

    test("attempt to login with the dummy account", async ({ client }) => {
        const response = await client
            .post("/api/v1/accounts/login")
            .json({
                username: "_test_dummy_account_create",
                password: "test_password12345"
            });

        // assert that the response has a 200 status code
        response.assertStatus(200);
    });

    group.teardown(async () => {
        // delete the dummy account from the database
        if (dummyAccount) {
            await dummyAccount.delete();
        }
    });
});
