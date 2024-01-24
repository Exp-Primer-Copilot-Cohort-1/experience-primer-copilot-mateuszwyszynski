// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Route handler for get request on /posts/:id/comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Route handler for post request on /posts/:id/comments
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id for comment
  const commentId = randomBytes(4).toString('hex');
  // Get content from request body
  const { content } = req.body;
  // Get comments for post id
  const comments = commentsByPostId[req.params.id] || [];
  // Push comment to comments array
  comments.push({ id: commentId, content, status: 'pending' });
  // Set comments for post id
  commentsByPostId[req.params.id] = comments;
  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });
  // Send response
  res.status(201).send(comments);
});

// Route handler for post request on /events
app.post('/events', async (req, res) => {
  // Get type and data from request body
  const { type, data } = req.body;
  // Check if type is CommentModerated
  if (type === 'CommentModerated') {
    // Get id, postId and status from data
    const { id, postId, status } = data;
    // Get comments for post id
    const comments = commentsByPostId[postId];
    // Find comment with id
    const comment = comments.find(comment => {
      return comment.id === id;
    });
    // Update status for comment
    comment.status = status;
    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events