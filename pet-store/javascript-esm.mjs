import { database } from "sdk/db";

let connection = database.getConnection("DefaultDB");
try {
    let statement = connection.prepareStatement("select * from `PETS`");
    let resultSet = statement.executeQuery();
    resultSet.toJson(false);
} catch (e) {
    if (e instanceof Error) {
        console.error(e);
    } else {
        console.error("Something went wrong", e);
    }
} 
