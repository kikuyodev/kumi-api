import { column } from "@ioc:Adonis/Lucid/Orm";

export default class NominationQueueTask {
    @column({
        isPrimary: true
    })
    public id: number;
}