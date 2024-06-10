import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface TypesEntity {
    readonly Id: number;
    Name?: string;
}

export interface TypesCreateEntity {
    readonly Name?: string;
}

export interface TypesUpdateEntity extends TypesCreateEntity {
    readonly Id: number;
}

export interface TypesEntityOptions {
    $filter?: {
        equals?: {
            Id?: number | number[];
            Name?: string | string[];
        };
        notEquals?: {
            Id?: number | number[];
            Name?: string | string[];
        };
        contains?: {
            Id?: number;
            Name?: string;
        };
        greaterThan?: {
            Id?: number;
            Name?: string;
        };
        greaterThanOrEqual?: {
            Id?: number;
            Name?: string;
        };
        lessThan?: {
            Id?: number;
            Name?: string;
        };
        lessThanOrEqual?: {
            Id?: number;
            Name?: string;
        };
    },
    $select?: (keyof TypesEntity)[],
    $sort?: string | (keyof TypesEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface TypesEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<TypesEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface TypesUpdateEntityEvent extends TypesEntityEvent {
    readonly previousEntity: TypesEntity;
}

export class TypesRepository {

    private static readonly DEFINITION = {
        table: "TYPES",
        properties: [
            {
                name: "Id",
                column: "TYPES_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
            },
            {
                name: "Name",
                column: "TYPES_NAME",
                type: "VARCHAR",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(TypesRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: TypesEntityOptions): TypesEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): TypesEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: TypesCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "TYPES",
            entity: entity,
            key: {
                name: "Id",
                column: "TYPES_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: TypesUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "TYPES",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "TYPES_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: TypesCreateEntity | TypesUpdateEntity): number {
        const id = (entity as TypesUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as TypesUpdateEntity);
            return id;
        } else {
            return this.create(entity);
        }
    }

    public deleteById(id: number): void {
        const entity = this.dao.find(id);
        this.dao.remove(id);
        this.triggerEvent({
            operation: "delete",
            table: "TYPES",
            entity: entity,
            key: {
                name: "Id",
                column: "TYPES_ID",
                value: id
            }
        });
    }

    public count(options?: TypesEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "TYPES"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: TypesEntityEvent | TypesUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("pet-store-entities-Types", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("pet-store-entities-Types").send(JSON.stringify(data));
    }
}
