'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const { BlogPost } = require('../models');
const { runServer, app, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

// seeding data before running all tests means we need a function for doing so
function seedBlogData() {
	console.info('Seeding blog data');
	// this will become an array of objects to push to the test database
	const seedData = [];
	for (let i = 1; i <= 10; i++) {
		seedData.push(generateBlogData());
	}
	return BlogPost.insertMany(seedData);
}

// generate fake blog posts data
function generateFakeTitle() {
	return faker.random.word();
}

function generateFakeContent() {
	return faker.lorem.paragraph();
}

function generateFakeAuthor() {
	return {
		firstName: faker.name.firstName(),
		lastName: faker.name.lastName()
	}
}

// generate the blog post
function generateBlogData() {
	return {
		author: generateFakeAuthor(),
		title: generateFakeTitle(),
		content: generateFakeContent()
	}
}

// tearing down the database following the tests
function tearDownDb() {
	console.warn('Deleting entire test database');
	return mongoose.connection.dropDatabase();
}

// GET /posts
describe('blog post app', function() {

	// before and afters
	before(function() {
		return runServer(TEST_DATABASE_URL);
	})

	beforeEach(function() {
		return seedBlogData();
	})

	afterEach(function() {
		return tearDownDb();
	})

	after(function() {
		return closeServer();
	})

	// GET /posts
	describe('GET /posts endpoint', function() {
		it('should return all posts', function() {
			let res;
			return chai.request(app)
				.get('/posts')
				// first we need to take the response, and test if it matches our expectations
				.then(function(_res) {
					// save the response to the variable declared above
					res = _res;
					// expectations
					expect(_res).to.have.status(200);
					expect(_res.body).to.have.lengthOf.at.least(1);
					// return the number of entries in the database
					return BlogPost.count();
				})
				.then(function(databaseCount) {
					// we expect the response to have the same length as the db
					expect(res.body).to.have.lengthOf(databaseCount);
				});
		});

		it('should return posts with the right fields', function() {
			let testPost;
				return chai.request(app)
					.get('/posts')
					.then(function(_res) {
						// expectations for the response
						expect(_res).to.be.json;
						expect(_res.body).to.be.a('array');
						_res.body.forEach(function(post) {
							expect(post).to.include.keys('id', 'author', 'content', 'title', 'created');
						});
						// set the test post to equal one of the posts in the body
						testPost = _res.body[0];
						// return the post that test post should equal
						return BlogPost.findById(testPost.id);
					})
					.then(function(post) {
						// expectations for the post vs the database
						expect(post.id).to.equal(testPost.id);
						expect(testPost.author).to.contain(post.author.firstName);
						expect(testPost.author).to.contain(post.author.lastName);
						expect(post.content).to.equal(testPost.content);
						expect(post.title).to.equal(testPost.title);
					});
		});
	});

	// GET /posts/:id
	describe('GET /posts/:id endpoint', function() {
		it('should return a post with the correct id', function() {
			let testPost;
			return BlogPost
				// find a post in the database
				.findOne()
				.then(function(post) {
					// now do a get request using that post's id
					return chai.request(app)
						.get(`/posts/${post._id}`)
						.then(function(res) {
							// expectations for the result
							expect(res).to.have.status(200);
							expect(res.body).to.be.a('object');
							expect(res.body).to.have.keys('id', 'title', 'content', 'author', 'created');
							expect(res.body.id).to.equal(post.id);
							testPost = res.body;
							return BlogPost.findById(res.body.id);
						})
						.then(function(post) {
							// expecting the post to match the info in the database
							expect(post.id).to.equal(testPost.id);
							expect(testPost.author).to.contain(post.author.firstName);
							expect(testPost.author).to.contain(post.author.lastName);
							expect(post.content).to.equal(testPost.content);
							expect(post.title).to.equal(testPost.title);
						});
				});
		});
	});

	// POST /posts
	describe('POST /posts endpoint', function() {
		it('should make a post with the input data', function() {
			let newPost;
			const newPostRequest = generateBlogData();
			return chai.request(app)
				.post('/posts')
				.send(newPostRequest)
				.then(function(res) {
					newPost = res.body;
					expect(res).to.have.status(201);
					expect(res.body).to.be.a('object');
					expect(res.body).to.have.keys('id', 'author', 'content', 'title', 'created');
					return BlogPost.findById(res.body.id);
				})
				.then(function(databasePost) {
					// test if that new post response matches the database
					expect(newPost.id).to.equal(databasePost.id);
					expect(newPost.title).to.equal(databasePost.title);
					expect(newPost.content).to.equal(databasePost.content);
					expect(newPost.author).to.contain(databasePost.author.firstName);
					expect(newPost.author).to.contain(databasePost.author.lastName);
				});
		});
	});

	// DELETE /posts/:id
	describe('DELETE /posts/:id endpoint', function() {
		it('should delete the post with the given ID', function() {
			let deletedPostId;
			return BlogPost
				.findOne()
				.then(function(post) {
					deletedPostId = post.id;
					return chai.request(app)
						.delete(`/posts/${deletedPostId}`)
						.then(function(res) {
							// expectations
							expect(res).to.have.status(204);
							return BlogPost.findById(deletedPostId);
						})
						.then(function(res) {
							// verify the post is gone
							expect(res).to.not.exist;
						});
				});
		});
	});

	// DELETE /:id
	describe('DELETE /:id endpoint', function() {
		it('should delete the post with the given ID', function() {
			let deletedPostId;
			return BlogPost
				.findOne()
				.then(function(post) {
					deletedPostId = post.id;
					return chai.request(app)
						.delete(`/${deletedPostId}`)
						.then(function(res) {
							// expectations
							expect(res).to.have.status(204);
							return BlogPost.findById(deletedPostId);
						})
						.then(function(res) {
							// verify the post is gone
							expect(res).to.not.exist;
						});
				});
		});
	});

	// PUT /posts/:id
	describe('PUT /posts/:id endpoint', function() {
		it('should update the post with the given ID', function() {
			let updateData = generateBlogData();
			return BlogPost
				.findOne()
				.then(function(post) {
					updateData.id = post.id;
					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData)
						.then(function(res) {
							// checking if the response has the same info as the update data
							expect(res).to.have.status(204);
							return BlogPost.findById(updateData.id);
						})
						.then(function(dbPost) {
							// check if the updateData made it to the database
							expect(dbPost.id).to.equal(updateData.id);
							expect(dbPost.title).to.equal(updateData.title);
							expect(dbPost.content).to.equal(updateData.content);
							expect(dbPost.author.firstName).to.equal(updateData.author.firstName);
							expect(dbPost.author.lastName).to.equal(updateData.author.lastName);
						});
				});
		});
	});
});