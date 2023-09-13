const { faker } = require('@faker-js/faker');

function getRandomElement(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
  }
function createRandomUser() {
    const universities = [
        'Harvard University',
        'Stanford University',
        'MIT (Massachusetts Institute of Technology)',
        'University of Oxford',
        'University of Cambridge',
        'Princeton University',
        "University of Florida",
        "Carnegie Mellon"
      ];      
    return {
      email: faker.internet.email(),
      image_url: faker.image.avatar(),
      password: faker.internet.password(),
      name: faker.person.fullName(),
      lives: faker.location.city(),
      job: faker.person.jobTitle(),
      studies_at: getRandomElement(universities),
      bio: "",
      friends_list: [],
      comments: [],
    };
  }
  
  const USERS = faker.helpers.multiple(createRandomUser, {
    count: 1,
  });
  
  module.exports = {
    createRandomUser,
    USERS,
  };  
  
  
  
  
  