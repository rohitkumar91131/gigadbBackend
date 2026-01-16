const BPlusTree = require("./BPlusTree");

module.exports = {
  collections_userId_index_Tree: new BPlusTree(10),
  collections_name_index_Tree: new BPlusTree(10),
  users_userId_index_Tree : new BPlusTree(10),
  users_email_index_Tree : new BPlusTree(10)
};
