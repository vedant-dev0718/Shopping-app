const mongoose = require('mongoose');

const objectId = () => new mongoose.Types.ObjectId();

const clearDatabase = async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

module.exports = {
  objectId,
  clearDatabase
};
