/* eslint-disable @typescript-eslint/prefer-literal-enum-member */

/**
 * These are the permissions that can be assigned to a user.
 * They are stored as a bitfield, so they can be combined.
 * 
 * These should exist to make running the game, and all of
 * it's functions as listed here possible.
 * 
 * The permissions are as follows:
 * * The ability to manage users
 * * The ability to manage groups
 * * The ability to manage charts
 * * The ability to moderate (delete) charts
 * * The ability to moderate (ban, mute, etc) users
 * * The ability to nominate chart sets
 * * The ability to disqualify chart sets
 */
export enum Permissions {
    MANAGE_ACCOUNTS = 1 << 0,
    MANAGE_GROUPS = 1 << 1,
    MANAGE_GROUP_ASSIGNMENTS = 1 << 2,
    MANAGE_CHARTS = 1 << 3,
    MANAGE_CHART_METADATA = 1 << 4,
    MANAGE_CHAT_CHANNELS = 1 << 5,
    MODERATE_ACCOUNTS = 1 << 5,
    MODERATE_NOMINATORS = 1 << 6,
    MODERATE_CHARTS = 1 << 7,
    MODERATE_COMMENTS = 1 << 8,
    NOMINATE_CHARTS = 1 << 9,
    DISQUALIFY_CHARTS = 1 << 10,
}

export enum RestrictionFlags {
    IS_MUTED = 1 << 0,
    IS_BANNED = 1 << 1,
    IS_UNABLE_TO_UPLOAD = 1 << 2,
    IS_PROBATION = 1 << 3,
}