import BaseSeeder from "@ioc:Adonis/Lucid/Seeder";
import Account from "App/models/Account";

/**
 * basic seeder for test accounts
 * 
 * they all have the same password, and exists
 * primerily to test elements of the game. this
 * should never be done on production for obvious
 * reasons.
 */
export default class extends BaseSeeder {
	public static environment = ["development", "testing"];

	public async run() {
		// a test account to test uploading 
		// charts to the server
        await Account.createMany([{
			username: "Author",
			password: "password",
			email: "author@example.com"
		}]);
	}
}
