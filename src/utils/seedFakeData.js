const{ faker } =  require("@faker-js/faker");
const { ulid } = require("ulid");

function generateFakeDoc(collectionName) {
  switch (collectionName) {
    case "users":
      return {
        id : ulid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        age: faker.number.int({ min: 18, max: 60 }),
        createdAt: faker.date.past()
      };

    case "products":
      return {
        id : ulid(),
        title: faker.commerce.productName(),
        price: faker.commerce.price(),
        category: faker.commerce.department(),
        inStock: faker.datatype.boolean()
      };

    case "posts":
      return {
        id : ulid(),
        title: faker.lorem.sentence(),
        body: faker.lorem.paragraphs(2),
        likes: faker.number.int({ min: 0, max: 500 })
      };

    default:
      return {
        value: faker.lorem.word(),
        createdAt: new Date()
      };
  }
}


module.exports = generateFakeDoc