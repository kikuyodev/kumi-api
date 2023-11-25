import BaseSeeder from "@ioc:Adonis/Lucid/Seeder";
import Forum, { ForumFlags } from "../../app/models/forums/Forum";
import ForumTag from "../../app/models/forums/ForumTag";
import ForumPermission, { ForumPermissions } from "../../app/models/forums/ForumPermission";

export default class extends BaseSeeder {
	public async run() {
		await Forum.createMany([
            {
                id: 1,
                name: "Kumi",
                description: "The main forum for the discussion of all aspects of Kumi; such as the gameplay, it's development, new events, and more.",
                order: 1
            },
            {
                id: 2,
                name: "Development",
                description: "The place for discussion of the development of Kumi, such as new features, community projects, and more.",
                parentId: 1,
                order: 1,
            },
            {
                id: 3,
                name: "Feature Requests",
                description: "The place for requesting new features to be added to Kumi.",
                parentId: 2,
                order: 2
            },
            {
                id: 4,
                name: "Gameplay",
                description: "The place for discussion of the gameplay of Kumi, such as strategies, tips, and more.",
                parentId: 1,
                order: 2
            },
            {
                id: 5,
                name: "Tournaments & Events",
                description: "The place for discussion of tournaments and events in Kumi, and to embark on your own.",
                parentId: 1,
                order: 3
            },
            {
                id: 6,
                name: "Support",
                description: "The place in all of Kumi for support, whether it be for the game, the website, or anything else except account issues.",
                parentId: 1,
                order: 4
            },
            {
                id: 7,
                name: "Resolved Issues",
                description: "The place for resolved issues.",
                parentId: 7,
                order: 1
            },
            {
                id: 8,
                name: "Charting",
                description: "The place for discussion of charting in Kumi, such as charting techniques, tips, and more.",
                order: 2
            },
            {
                id: 9,
                name: "Ranking Criteria",
                description: "The place for discussion of the chart ranking criteria, including suggestions for changes.",
                parentId: 8,
                order: 1
            },
            {
                id: 10,
                name: "Chart Showcase",
                description: "The place for showcasing your charts.",
                parentId: 8,
                order: 2
            },
            {
                id: 11,
                name: "Guides & Techniques",
                description: "The place for guides and techniques for charting.",
                parentId: 8,
                order: 3
            },
            {
                id: 12,
                name: "General Discussion",
                description: "The place for general discussion, and all other topics that don't fit into any other forum.",
                order: 3
            },
            {
                id: 13,
                name: "General Discussion",
                description: "Post about anything here, except for things that have their own forum; and things that aren't just \"general discussion\".",
                parentId: 12,
                order: 1
            },
            {
                id: 14,
                name: "Off-Topic",
                description: "The place for off-topic discussion, such as memes, and other things that physically cannot fit into any other forum.",
                parentId: 12,
                order: 2
            },
            {
                id: 15,
                name: "Introductions",
                description: "The place for introducing yourself to the community.",
                parentId: 12,
                order: 3
            },
            {
                id: 16,
                name: "Forum Games",
                description: "The place for forum games, and other polls and similar things.",
                parentId: 15,
                order: 1
            },
            {
                id: 17,
                name: "Gaming",
                description: "The place for discussion of gaming, such as other rhythm games, and other games.",
                parentId: 12,
                order: 4
            },
            {
                id: 18,
                name: "Management/Internal",
                description: "The place for internal discussion of the management of the community, such as staff applications, and more.",
                order: 3,
                flags: ForumFlags.Private
            },
            {
                id: 19,
                name: "Lounge",
                description: "A general discussion forum for the staff team.",
                parentId: 18,
                order: 1
            }
        ]);

        const ManagementViewIds = [ 4, 5 ];
        const ManagementModeratorIds = [ 1, 2, 3 ];

        await ForumPermission.createMany([
            ...ManagementViewIds.map(id => ({
                forumId: 18,
                groupId: id,
                permissions: ForumPermissions.CanView
                    | ForumPermissions.CanPostReplies
                    | ForumPermissions.CanPostThreads
            })),
            ...ManagementModeratorIds.map(id => ({
                forumId: 18,
                groupId: id,
                permissions: ForumPermissions.CanView
                | ForumPermissions.CanPostReplies
                | ForumPermissions.CanPostThreads
                | ForumPermissions.CanModerateForum
            }))
        ]);

	}
}
