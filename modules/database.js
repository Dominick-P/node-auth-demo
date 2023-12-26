const { MongoClient } = require('mongodb');
const mongoUri = process.env.MONGO_URI;

const uri = mongoUri
const client = new MongoClient(uri);

module.exports = {
    connect: async () => {
        return client.connect();
    },

    client: () => {
        return client;
    }
}