const DBHandler = require('./db_handler');
const mongoose = require('mongoose')
const { getMockReq, getMockRes } = require('@jest-mock/express')
const Game = require('../models/GameModel.js')
const Player = require('../models/PlayerModel.js')
const { createGame, initGame } = require('../controllers/GameController.js')

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

        beforeEach(async () => {
            const { res } = getMockRes()

            await createGame(req, res)
        })

        it("should create a game with the correct name", async () => {
            const fetchedGameDoc = (await Game.find({}))[0];

            expect(fetchedGameDoc.name).toStrictEqual(gamePostObject.name)
        })

        it("Should create a player with the right game_id with createGame", async () => {
            const fetchedPlayerDoc = (await Player.find({}))[0];
            const fetchedGameDoc = (await Game.find({}))[0];

            expect(fetchedPlayerDoc.game_id).toStrictEqual(fetchedGameDoc._id)
        })

        it("Should create a player with the right user_id with createGame", async () => {
            const fetchedPlayerDoc = (await Player.find({}))[0];

            expect(fetchedPlayerDoc.user_id).toStrictEqual(userId)
        })
    })

    describe("initGame",  () => {
        it("should update all players' position", async () => {
            const game = await new Game(testGameData).save()

            const playerSavePromises = [];

            for (let i = 0; i < 20; i++) {
                playerSavePromises.push(new Player({
                    name: "test",
                    game_id: game._id
                }).save())
            }

            await Promise.all(playerSavePromises)

            const req = {
                params: {
                    gameId: game._id
                }
            }

            const { res } = getMockRes();

            await initGame(req, res);

            const fetchedPlayers = await Player.find({})

            fetchedPlayers.forEach(player => {
                expect(player.position.x !== undefined && player.position.y !== undefined ).toBeTruthy()
            })
        })
    })
})