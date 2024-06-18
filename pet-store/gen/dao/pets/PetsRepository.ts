import { query } from "sdk/db";
import { producer } from "sdk/messaging";
import { extensions } from "sdk/extensions";
import { dao as daoApi } from "sdk/db";

export interface PetsEntity {
    readonly Id: number;
    Name?: string;
    Age?: number;
    Types?: number;
}

export interface PetsCreateEntity {
    readonly Name?: string;
    readonly Age?: number;
    readonly Types?: number;
}

export interface PetsUpdateEntity extends PetsCreateEntity {
    readonly Id: number;
}

export interface PetsEntityOptions {
    $filter?: {
        equals?: {
            Id?: number | number[];
            Name?: string | string[];
            Age?: number | number[];
            Types?: number | number[];
        };
        notEquals?: {
            Id?: number | number[];
            Name?: string | string[];
            Age?: number | number[];
            Types?: number | number[];
        };
        contains?: {
            Id?: number;
            Name?: string;
            Age?: number;
            Types?: number;
        };
        greaterThan?: {
            Id?: number;
            Name?: string;
            Age?: number;
            Types?: number;
        };
        greaterThanOrEqual?: {
            Id?: number;
            Name?: string;
            Age?: number;
            Types?: number;
        };
        lessThan?: {
            Id?: number;
            Name?: string;
            Age?: number;
            Types?: number;
        };
        lessThanOrEqual?: {
            Id?: number;
            Name?: string;
            Age?: number;
            Types?: number;
        };
    },
    $select?: (keyof PetsEntity)[],
    $sort?: string | (keyof PetsEntity)[],
    $order?: 'asc' | 'desc',
    $offset?: number,
    $limit?: number,
}

interface PetsEntityEvent {
    readonly operation: 'create' | 'update' | 'delete';
    readonly table: string;
    readonly entity: Partial<PetsEntity>;
    readonly key: {
        name: string;
        column: string;
        value: number;
    }
}

interface PetsUpdateEntityEvent extends PetsEntityEvent {
    readonly previousEntity: PetsEntity;
}

export class PetsRepository {

    private static readonly DEFINITION = {
        table: "PETS",
        properties: [
            {
                name: "Id",
                column: "PETS_ID",
                type: "INTEGER",
                id: true,
                autoIncrement: true,
                required: true
            },
            {
                name: "Name",
                column: "PETS_NAME",
                type: "VARCHAR",
            },
            {
                name: "Age",
                column: "PETS_AGE",
                type: "INTEGER",
            },
            {
                name: "Types",
                column: "PETS_TYPES",
                type: "INTEGER",
            }
        ]
    };

    private readonly dao;

    constructor(dataSource = "DefaultDB") {
        this.dao = daoApi.create(PetsRepository.DEFINITION, null, dataSource);
    }

    public findAll(options?: PetsEntityOptions): PetsEntity[] {
        return this.dao.list(options);
    }

    public findById(id: number): PetsEntity | undefined {
        const entity = this.dao.find(id);
        return entity ?? undefined;
    }

    public create(entity: PetsCreateEntity): number {
        const id = this.dao.insert(entity);
        this.triggerEvent({
            operation: "create",
            table: "PETS",
            entity: entity,
            key: {
                name: "Id",
                column: "PETS_ID",
                value: id
            }
        });
        return id;
    }

    public update(entity: PetsUpdateEntity): void {
        const previousEntity = this.findById(entity.Id);
        this.dao.update(entity);
        this.triggerEvent({
            operation: "update",
            table: "PETS",
            entity: entity,
            previousEntity: previousEntity,
            key: {
                name: "Id",
                column: "PETS_ID",
                value: entity.Id
            }
        });
    }

    public upsert(entity: PetsCreateEntity | PetsUpdateEntity): number {
        const id = (entity as PetsUpdateEntity).Id;
        if (!id) {
            return this.create(entity);
        }

        const existingEntity = this.findById(id);
        if (existingEntity) {
            this.update(entity as PetsUpdateEntity);
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
            table: "PETS",
            entity: entity,
            key: {
                name: "Id",
                column: "PETS_ID",
                value: id
            }
        });
    }

    public count(options?: PetsEntityOptions): number {
        return this.dao.count(options);
    }

    public customDataCount(): number {
        const resultSet = query.execute('SELECT COUNT(*) AS COUNT FROM "PETS"');
        if (resultSet !== null && resultSet[0] !== null) {
            if (resultSet[0].COUNT !== undefined && resultSet[0].COUNT !== null) {
                return resultSet[0].COUNT;
            } else if (resultSet[0].count !== undefined && resultSet[0].count !== null) {
                return resultSet[0].count;
            }
        }
        return 0;
    }

    private async triggerEvent(data: PetsEntityEvent | PetsUpdateEntityEvent) {
        const triggerExtensions = await extensions.loadExtensionModules("pet-store-pets-Pets", ["trigger"]);
        triggerExtensions.forEach(triggerExtension => {
            try {
                triggerExtension.trigger(data);
            } catch (error) {
                console.error(error);
            }            
        });
        producer.topic("pet-store-pets-Pets").send(JSON.stringify(data));
    }
}
