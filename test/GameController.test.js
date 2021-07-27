const DBHandler = require('./db_handler');
const mongoose = require('mongoose')
const { getMockReq, getMockRes } = require('@jest-mock/express')
const Game = require('../models/GameModel.js')
const Player = require('../models/PlayerModel.js')
const { createGame, startGame, deleteGame } = require('../controllers/GameController.js')

DBHandler.setup();

const testGameData = {
    name: "TESTSTST",
    size: {
        width: 12,
        height: 12
    },
    creator_id: mongoose.Types.ObjectId()
}

describe("GameController", () => {
    describe("createGame", () => {
        const userId = mongoose.Types.ObjectId();
        const username = "Test user";

        const gamePostObject = {
            name: "TestGame",
            size: 10 // todo: change if size format from POST is changed
        }

        // Request and response mock
        const req = {
            user: {
                id: userId,
                username: username
            },
            body: {
                ...gamePostObject,
                displayName: "Test player"
            }
        }

        const { res } = getMockRes()

        // Mocks
        let playerSpy; // Use for mocking if Player.save() throws an error

        afterEach(() => {
            if (playerSpy) playerSpy.mockRestore();
        })

        it("should create a game with the correct name", async () => {
            await createGame(req, res)

            const fetchedGameDoc = (await Game.find({}))[0];

            expect(fetchedGameDoc.name).toStrictEqual(gamePostObject.name)
        })

        it("Should create a player with the right game_id", async () => {
            await createGame(req, res)

            const fetchedPlayerDoc = (await Player.find({}))[0];
            const fetchedGameDoc = (await Game.find({}))[0];

            expect(fetchedPlayerDoc.game_id).toStrictEqual(fetchedGameDoc._id)
        })

        it("Should create a player with the right user_id", async () => {
            await createGame(req, res)

            const fetchedPlayerDoc = (await Player.find({}))[0];

            expect(fetchedPlayerDoc.user_id).toStrictEqual(userId)
        })

        it("Should delete the game if the player is failed to be created", async () => {
            // Make the db save fail
            playerSpy = jest.spyOn(Player.prototype, 'save').mockImplementation(async () => {
                throw new Error()
            });

            await createGame(req, res)

            const fetchedGameDocs = await Game.find({});

            // Should find 0 games because it was deleted
            expect(fetchedGameDocs.length).toBe(0)
        })
    })

    describe("startGame",   () => {
        let req, res;

        beforeEach(async () => {
            const game = await new Game(testGameData).save()

            const playerSavePromises = [];

            for (let i = 0; i < 20; i++) {
                playerSavePromises.push(new Player({
                    name: "test",
                    game_id: game._id
                }).save())
            }

            await Promise.all(playerSavePromises)

            req = {
                params: {
                    gameId: game._id
                }
            }

            const { resMock } = getMockRes();

            res = resMock;
        })

        it("should initialize all players' position", async () => {
            await startGame(req, res);

            const fetchedPlayers = await Player.find({})

            fetchedPlayers.forEach(player => {
                expect(player.position.x !== undefined && player.position.y !== undefined ).toBeTruthy()
            })
        })

        it("should initialize unique positions", async () => {
            await startGame(req, res);

            const fetchedPlayers = await Player.find({})

            // Using stringify to make Set work with objects
            const positions = fetchedPlayers.map(player => JSON.stringify(player.position))

            expect(new Set(positions).size).toBe(positions.length)
        })
    })

    describe("deleteGame", () => {
        it("should delete all the games players", async() => {
            const game = await new Game(testGameData).save();
            const gameId = game._id

            for (let  i = 0; i < 10; i++) {
                await new Player({ name: "lol", user_id: mongoose.Types.ObjectId(), game_id: gameId}).save()
            }

            const req = {
                params: {
                    gameId: gameId
                }
            }

            const { res } = getMockRes()

            await deleteGame(req, res);

            const games = await Game.findById(gameId)
            const players = await Player.find({ game_id: gameId })

            expect(players.length).toBe(0)
        })
    })
})