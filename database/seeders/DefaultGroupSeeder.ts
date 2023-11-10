import BaseSeeder from "@ioc:Adonis/Lucid/Seeder";
import Group from "App/models/Group";
import { Permissions } from "App/util/Constants";

/**
 * Creates default groups for the site. Initially, this will be:
 * 
 * - Development Team
 * Color: #425df5
 * A team of people who manage the development of the game, in the
 * form of it's website, the game itself; managing the servers or
 * the daily community activities and operations of the game, as
 * well as the community itself.
 * 
 * They have the highest priority out of any group, and have the
 * highest permissions out of any group; being granted every
 * permission the API can offer it.
 * 
 * Inevitably, this means that they have the final say in all
 * significant decisions regarding the game and the community;
 * and thus this group should be kept small as possible, where
 * it's members represent the community as a whole.
 * 
 * Initially, this group will be comprised of the following people:
 * - Core Developers
 * - Community Managers
 * - Alumni that have contributed significantly to the game, and 
 *   are therefore given the privilege of being a part of the
 *   development team for life; if they so choose to stay.
 * 
 * - Community Moderation Team
 * Color: #4af063
 * 
 * People who have the responsibility of moderating the community,
 * and ensuring that the community is free of any malicious or
 * otherwise unsafe content that violates the rules of the game.
 * 
 * Resultingly, this means that they have the privilege of banning
 * or muting users that violate the rules of the game, and thus
 * are expected to be fair and just in their decisions.
 * 
 * They share a priority with their sister group, the Nominator
 * Assessment Team, and thus have the same permissions as them;
 * except they cannot nominate charts for the game.
 * 
 * - Nominator Assessment Team
 * Color: #f54290
 * 
 * People who have the responsibility of assessing the quality of
 * members of the Chart Nomination Team, and ensuring that they
 * are fit to nominate charts for the game.
 * 
 * This also includes initial priorities such as formalizing all
 * documentation and processes regarding the nomination of charts;
 * such as criterion for what makes a chart eligible for nomination,
 * and the means at which a chart can be nominated.
 * 
 * They share a priority with their sister group, the Community
 * Moderation Team, and thus have the same permissions as them;
 * however, they have the privilege of nominating charts for the
 * game; but it is not a required task of them.
 * 
 * Initially, they are entrusted to handle all of the initial
 * internal processes of the game; including but not limited to:
 * - Formalizing the criterion for what makes a chart eligible for
 *   nomination
 * - and creating the initial code of conduct for nominators.
 * 
 * Additionally, it likely won't go beyond invite-only for a while.
 * 
 * This role primarily exists to circumvent the fact none of the
 * developers of the game have skills like these, and are purely
 * tasked with the development of the game itself.
 *       (tl;dr yuki can't mod)
 * 
 * - Chart Nomination Team
 * Color: #f54290
 * 
 * People who are responsible for nominating charts for the game,
 * and ensuring that the charts are of high quality as per the
 * standards of the game. They hold the role of ensuring that the
 * best interest of the game is kept in mind when nominating charts;
 * and are given the privilege of disqualifying charts that do not
 * meet the standards of the game, by their own interpretation and
 * initiative.
 * 
 * They should be fair and just in their decisions, and should
 * be able to justify their decisions to the Nominator Assessment
 * Team, if they are asked to do so.
 * 
 * - Quality Assurance
 * Color: #f56942
 * 
 * People who are responsible for ensuring that charts qualified
 * are of high quality, and are free of any bugs or unrankable
 * issues that violate the standards of the game.
 * 
 * They're not the same priority as the Chart Nomination Team,
 * as they do not have the ability of ranking charts; but they
 * do have the ability to disqualify them.
 * 
 * However, they're held to a higher degree of expectation than
 * their sister group, as they are expected to be able to justify
 * their decisions when asked to do so; a trait that is shared
 * with nominators themselves.
 * 
 * - Alumni
 * #363e6e
 * 
 * Former members of a high and significant role in the game,
 * that have since retired from their role; but are still
 * considered to be a part of the community for their
 * contributions to the game.
 * 
 * Sometimes, if they are deemed to be fit for the role, they
 * may be given the privilege of being a part of the development
 * team to onlook and advise the development of the game; but
 * this is not a requirement of them, and is only given to them
 * if offered.
 */
const qaPermissions = Permissions.DISQUALIFY_CHARTS;
const cnPermissions = Permissions.NOMINATE_CHARTS | qaPermissions;
const modPermissions = Permissions.MANAGE_GROUP_ASSIGNMENTS | Permissions.MODERATE_ACCOUNTS | Permissions.MODERATE_CHARTS | Permissions.MODERATE_COMMENTS;
const natPermissions = modPermissions | cnPermissions;
const allPermissions = Object.values(Permissions).reduce((a, b) => a | b as number, 0);

export default class extends BaseSeeder {
	public async run() {
		await Group.createMany([
			{
				name: "Development Team",
				tag: "DEV",
				identifier: "dev",
				permissions: allPermissions,
				priority: 255,
				color: "#191d9c"
			},
			{
				name: "Global Moderation Team",
				tag: "GM",
				identifier: "GM",
				permissions: modPermissions,
				priority: 100,
				color: "#f5ca31"
			},
			{
				name: "Nomination Assessment Team",
				tag: "NAT",
				identifier: "nat",
				permissions: natPermissions,
				priority: 100,
				color: "#f56231"
			},
			{
				name: "Chart Nominator",
				tag: "CN",
				identifier: "cn",
				permissions: cnPermissions,
				priority: 50,
				color: "#19989c"
			},
			{
				name: "Quality Assurance",
				tag: "QA",
				identifier: "qa",
				permissions: qaPermissions,
				priority: 49,
				color: "#d636c6"
			},
			{
				name: "Alumni",
				tag: "ALUM",
				identifier: "alum",
				permissions: 10,
				color: "#575999"
			}
		]);
	}
}
