const express = require('express');
const bodyParser = require('body-parser');
const graphQlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./model/event');
const User = require('./model/user')

const app = express();

app.use(bodyParser.json());

app.use('/graphql',
    graphQlHttp.graphqlHTTP({
        schema: buildSchema(`

        type Event {
            _id:  ID!
            title : String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput{
            email: String!
            password: String!
            
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(EventInput : EventInput) : Event
            createUser(userInput: UserInput) : User
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
        rootValue: {
            events: () => {
                return Event.find().then(events => {
                    return events.map(event => {
                        return { ...event._doc, _id: event.id };
                    });
                }).catch(err => {
                    throw err;
                })
            },
            createEvent: (args) => {
                const event = new Event({
                    title: args.EventInput.title,
                    description: args.EventInput.description,
                    price: +args.EventInput.price,
                    date: new Date(args.EventInput.date),
                    creator: '614c1a8b64020edf8fc3f798'
                })
                let createdEvent;
                return event
                    .save()
                    .then(result => {
                        createdEvent = { ...result._doc, _id: result._doc._id.toString() };
                        return User.findById('614c1a8b64020edf8fc3f798')
                    })
                    .then(user => {
                        if (!user) {
                            throw new Error('User not found')
                        }
                        user.createdEvents.push(event);
                        return user.save();
                    }).
                    then(result =>{
                        return createdEvent;
                    })
                    .catch(err => {
                        console.log(err);
                        throw err;
                    });
            },
            createUser: args => {
                return User.findOne({ email: args.userInput.email }).then(user => {
                    if (user) {
                        throw new Error('User exists already.')
                    }
                    return bcrypt.hash(args.userInput.password, 12)

                }).then(hashedPassword => {
                    const user = new User({
                        email: args.userInput.email,
                        password: hashedPassword
                    });
                    return user.save();
                })
                    .then(result => {
                        return { ...result._doc, password: null, _id: result.id };
                    })
                    .catch(err => {
                        throw err;
                    })
            }
        },
        graphiql: true
    })
);

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER
    }:${process.env.MONGO_PASSWORD
    }@cluster0.mcfah.mongodb.net/${process.env.MONGO_DB}?retryWrites=true`
).then(() => {
    app.listen(3000);
}).catch(err => {
    console.log(err)
})