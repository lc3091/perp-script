const fs = require('fs')
const fetch = require('cross-fetch')
const { Contract, providers, Wallet } = require("ethers")
const xDaiUrl = "https://rpc.xdaichain.com/"
const infuraProjectId = "3a9d7010974a4cc2b39e287875e0dfd3"
const rinkebyUrl = "https://rinkeby.infura.io/v3/" + infuraProjectId
const layer1Provider = new providers.JsonRpcProvider(rinkebyUrl)
const layer2Provider = new providers.JsonRpcProvider(xDaiUrl)
const privateKey = "ab57a905981d4975078d82609bdbfc71ef4fdc51f9c5997b0a81364d09ac8056"
const layer1Wallet = new Wallet(privateKey, layer1Provider)
const layer2Wallet = new Wallet(privateKey, layer2Provider)
const { parseUnits, formatEther, formatUnits } = require("ethers/lib/utils")
const Web3 = require('web3')
// const web3Contract = require('web3-eth-contract')
const Web3HttpProvider = require('web3-providers-http');
const { strict } = require('assert')

let options = {
    keepAlive: true,
    withCredentials: false,
    timeout: 200000, // ms
};

let providerWithOption = new Web3HttpProvider(xDaiUrl, options);
const web3 = new Web3(providerWithOption)

const ABI_AMB_LAYER1 = [
    "event RelayedMessage(address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
    "event AffirmationCompleted( address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
]

const ABI_AMB_LAYER2 = [
    "event AffirmationCompleted( address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
]

const SHORT_POS = 1
const DEFAULT_DECIMALS = 18
const PNL_OPTION_SPOT_PRICE = 0
const SHORT_AMOUNT = "100"
const ACTION_DEPOSIT = 0
const ACTION_WITHDRAW = 1

const url = "https://metadata.perp.exchange/production.json"
let metadata

(async () => {
    try {
        const res = await fetch(url)

        if (res.status >= 400) {
            throw new Error("Bad response from server");
        }

        metadata = await res.json();
        // console.log(JSON.stringify(metadata))
    } catch (err) {
        console.error(err)
    }

    const AmmArtifact = require("@perp/contract/build/contracts/Amm.json")
    const ClearingHouseArtifact = require("@perp/contract/build/contracts/ClearingHouse.json")
    const RootBridgeArtifact = require("@perp/contract/build/contracts/RootBridge.json")
    const ClientBridgeArtifact = require("@perp/contract/build/contracts/ClientBridge.json")
    const ClearingHouseViewerArtifact = require("@perp/contract/build/contracts/ClearingHouseViewer.json")
    const TetherTokenArtifact = require("@perp/contract/build/contracts/TetherToken.json")
    const AmmReaderArtifact = require("@perp/contract/build/contracts/AmmReader.json")

    // layer 1 contracts
    const layer1BridgeAddr = metadata.layers.layer1.contracts.RootBridge.address
    const usdcAddr = metadata.layers.layer1.externalContracts.tether
    const layer1AmbAddr = metadata.layers.layer1.externalContracts.ambBridgeOnEth

    const layer1Usdc = new Contract(usdcAddr, TetherTokenArtifact.abi, layer1Wallet)
    const layer1Bridge = new Contract(layer1BridgeAddr, RootBridgeArtifact.abi, layer1Wallet)
    const layer1Amb = new Contract(layer1AmbAddr, ABI_AMB_LAYER1, layer1Wallet)

    // layer 2 contracts
    const layer2BridgeAddr = metadata.layers.layer2.contracts.ClientBridge.address
    const layer2AmbAddr = metadata.layers.layer2.externalContracts.ambBridgeOnXDai
    const xUsdcAddr = metadata.layers.layer2.externalContracts.tether
    const clearingHouseAddr = metadata.layers.layer2.contracts.ClearingHouse.address
    const chViewerAddr = metadata.layers.layer2.contracts.ClearingHouseViewer.address

    const ammInfo = [
        { 
            name: "ETH", 
            contract: new Contract(metadata.layers.layer2.contracts.ETHUSDC.address, AmmArtifact.abi, layer2Wallet), 
            address: metadata.layers.layer2.contracts.ETHUSDC.address
        },
        { 
            name: "BTC", 
            contract: new Contract(metadata.layers.layer2.contracts.BTCUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.BTCUSDC.address
        },
        { 
            name: "YFI", 
            contract: new Contract(metadata.layers.layer2.contracts.YFIUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.YFIUSDC.address
        },
        { 
            name: "DOT", 
            contract: new Contract(metadata.layers.layer2.contracts.DOTUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.DOTUSDC.address
        },
        { 
            name: "LINK", 
            contract: new Contract(metadata.layers.layer2.contracts.LINKUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.LINKUSDC.address
        },
        { 
            name: "SNX", 
            contract: new Contract(metadata.layers.layer2.contracts.SNXUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.SNXUSDC.address
        },
        { 
            name: "AAVE", 
            contract: new Contract(metadata.layers.layer2.contracts.AAVEUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.AAVEUSDC.address
        },
        { 
            name: "SUSHI", 
            contract: new Contract(metadata.layers.layer2.contracts.SUSHIUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.SUSHIUSDC.address
        },
        { 
            name: "REN", 
            contract: new Contract(metadata.layers.layer2.contracts.RENUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.RENUSDC.address
        },
        { 
            name: "COMP", 
            contract: new Contract(metadata.layers.layer2.contracts.COMPUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.COMPUSDC.address
        },
        { 
            name: "UNI", 
            contract: new Contract(metadata.layers.layer2.contracts.UNIUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.UNIUSDC.address
        },
        { 
            name: "PERP", 
            contract: new Contract(metadata.layers.layer2.contracts.PERPUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.PERPUSDC.address
        },
        { 
            name: "CRV", 
            contract: new Contract(metadata.layers.layer2.contracts.CRVUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.CRVUSDC.address
        },
        { 
            name: "MKR", 
            contract: new Contract(metadata.layers.layer2.contracts.MKRUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.MKRUSDC.address
        },
        { 
            name: "CREAM", 
            contract: new Contract(metadata.layers.layer2.contracts.CREAMUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.CREAMUSDC.address
        },
        { 
            name: "GRT", 
            contract: new Contract(metadata.layers.layer2.contracts.GRTUSDC.address, AmmArtifact.abi, layer2Wallet),
            address: metadata.layers.layer2.contracts.GRTUSDC.address
        }
    ]

    const ammETHAddr = metadata.layers.layer2.contracts.ETHUSDC.address
    const ammBTCAddr = metadata.layers.layer2.contracts.BTCUSDC.address
    const ammYFIAddr = metadata.layers.layer2.contracts.YFIUSDC.address
    const ammDOTAddr = metadata.layers.layer2.contracts.DOTUSDC.address
    const ammLINKAddr = metadata.layers.layer2.contracts.LINKUSDC.address
    const ammSNXAddr = metadata.layers.layer2.contracts.SNXUSDC.address
    const ammAAVEAddr = metadata.layers.layer2.contracts.AAVEUSDC.address
    const ammSUSHIAddr = metadata.layers.layer2.contracts.SUSHIUSDC.address
    const ammRENAddr = metadata.layers.layer2.contracts.RENUSDC.address
    const ammCOMPAddr = metadata.layers.layer2.contracts.COMPUSDC.address
    const ammReaderAddr = metadata.layers.layer2.contracts.AmmReader.address

    const layer2Usdc = new Contract(xUsdcAddr, TetherTokenArtifact.abi, layer2Wallet)
    const ammETH = new Contract(ammETHAddr, AmmArtifact.abi, layer2Wallet)
    const ammBTC = new Contract(ammBTCAddr, AmmArtifact.abi, layer2Wallet)
    const ammYFI = new Contract(ammYFIAddr, AmmArtifact.abi, layer2Wallet)
    const ammDOT = new Contract(ammDOTAddr, AmmArtifact.abi, layer2Wallet)
    const ammLINK = new Contract(ammLINKAddr, AmmArtifact.abi, layer2Wallet)
    // const ammReader = new Contract(ammReaderAddr, AmmReaderArtifact, layer2Wallet)
    const clearingHouse = new Contract(clearingHouseAddr, ClearingHouseArtifact.abi, layer2Wallet)
    const clearingHouseViewer = new Contract(chViewerAddr, ClearingHouseViewerArtifact.abi, layer2Wallet)
    const layer2Amb = new Contract(layer2AmbAddr, ABI_AMB_LAYER2, layer2Wallet)
    const layer2Bridge = new Contract(layer2BridgeAddr, ClientBridgeArtifact.abi, layer2Wallet)
    const clearingHouseContract = new web3.eth.Contract(ClearingHouseArtifact.abi, clearingHouseAddr)
    const ammETHContract = new web3.eth.Contract(AmmArtifact.abi, ammETHAddr)
    const ammBTCContract = new web3.eth.Contract(AmmArtifact.abi, ammBTCAddr)
    const layer2UsdcContract = new web3.eth.Contract(TetherTokenArtifact.abi, xUsdcAddr)

    let amms = [
        '0x8d22F1a9dCe724D8c1B4c688D75f17A2fE2D32df',   // ETH
        '0x0f346e19F01471C02485DF1758cfd3d624E399B4',   // BTC
        '0x6de775aaBEEedE8EFdB1a257198d56A3aC18C2FD',   // DOT
        '0xd41025350582674144102B74B8248550580bb869',   // YFI
        '0x80DaF8ABD5a6Ba182033B6464e3E39A0155DCC10',   // LINK
    ]

    // let traderX = '0x68dfc526037E9030c8F813D014919CC89E7d4d74'

    // console.log('------------------------------------------------------------')
    // for (let i = 0; i < amms.length; i++) {
    //     let amm = amms[i]
    //     console.log("- amm", amm)
    //     let position = await clearingHouse.getPosition(amm, traderX)
    //     console.log("- margin", formatUnits(position.margin.d, DEFAULT_DECIMALS))
    //     console.log("- size", formatUnits(position.size.d, DEFAULT_DECIMALS))
    //     console.log('------------------------------------------------------------')
    // }

    // const margin = await clearingHouseViewer.getMarginRatio()
    // console.log(margin)

    // const position = await clearingHouseViewer.getPersonalPositionWithFundingPayment(amm.address, layer2Wallet.address)
    // const margin = await clearingHouseViewer.getMarginRatio(amm.address, layer2Wallet.address)

    // console.log("- current position", formatUnits(position.size.d, DEFAULT_DECIMALS))
    // console.log("- margin ratio", formatUnits(margin.d, DEFAULT_DECIMALS))

    // const ammStates = await ammReader.getAmmStates(ammAddr)
    // console.log(ammStates)

    // const spotPrice = await amm.getSpotPrice()
    // const tradeLimitRatio = await amm.tradeLimitRatio()
    // const fluctuationLimitRatioETH = await ammETH.fluctuationLimitRatio()
    // const fluctuationLimitRatioBTC = await ammBTC.fluctuationLimitRatio()
    // const fluctuationLimitRatioYFI = await ammYFI.fluctuationLimitRatio()
    // const fluctuationLimitRatioDOT = await ammDOT.fluctuationLimitRatio()

    // console.log("- spot price", formatUnits(spotPrice.d, DEFAULT_DECIMALS))
    // console.log("- trade limit ratio", formatUnits(tradeLimitRatio, DEFAULT_DECIMALS))
    // console.log("- ETH fluctuation limit ratio", formatUnits(fluctuationLimitRatioETH, DEFAULT_DECIMALS))
    // console.log("- BTC fluctuation limit ratio", formatUnits(fluctuationLimitRatioBTC, DEFAULT_DECIMALS))
    // console.log("- YFI fluctuation limit ratio", formatUnits(fluctuationLimitRatioYFI, DEFAULT_DECIMALS))
    // console.log("- DOT fluctuation limit ratio", formatUnits(fluctuationLimitRatioDOT, DEFAULT_DECIMALS))

    // const maxHoldingETH = await ammETH.getMaxHoldingBaseAsset()
    // const openNotionalCapETH = await ammETH.getOpenInterestNotionalCap()
    // const maxHoldingBTC = await ammBTC.getMaxHoldingBaseAsset()
    // const openNotionalCapBTC = await ammBTC.getOpenInterestNotionalCap()
    // const maxHoldingLINK = await ammLINK.getMaxHoldingBaseAsset()
    // const openNotionalCapLINK = await ammLINK.getOpenInterestNotionalCap()
    // const maxHoldingDOT = await ammDOT.getMaxHoldingBaseAsset()
    // const openNotionalCapDOT = await ammDOT.getOpenInterestNotionalCap()

    // const reserveETH = await ammETH.getReserve()
    // const reserveBTC = await ammBTC.getReserve()
    // const reserveLINK = await ammLINK.getReserve()
    // const reserveDOT = await ammDOT.getReserve()

    // console.log("- ETH Cap", formatUnits(maxHoldingETH.d, DEFAULT_DECIMALS), formatUnits(openNotionalCapETH.d, DEFAULT_DECIMALS))
    // console.log("- BTC Cap", formatUnits(maxHoldingBTC.d, DEFAULT_DECIMALS), formatUnits(openNotionalCapBTC.d, DEFAULT_DECIMALS))
    // console.log("- LINK Cap", formatUnits(maxHoldingLINK.d, DEFAULT_DECIMALS), formatUnits(openNotionalCapLINK.d, DEFAULT_DECIMALS))
    // console.log("- DOT Cap", formatUnits(maxHoldingDOT.d, DEFAULT_DECIMALS), formatUnits(openNotionalCapDOT.d, DEFAULT_DECIMALS))

    // console.log("- ETH Reserves", formatUnits(reserveETH[0].d, DEFAULT_DECIMALS), formatUnits(reserveETH[1].d, DEFAULT_DECIMALS))
    // console.log("- BTC Reserves", formatUnits(reserveBTC[0].d, DEFAULT_DECIMALS), formatUnits(reserveBTC[1].d, DEFAULT_DECIMALS))
    // console.log("- LINK Reserves", formatUnits(reserveLINK[0].d, DEFAULT_DECIMALS), formatUnits(reserveLINK[1].d, DEFAULT_DECIMALS))
    // console.log("- DOT Reserves", formatUnits(reserveDOT[0].d, DEFAULT_DECIMALS), formatUnits(reserveDOT[1].d, DEFAULT_DECIMALS))

    let totalMargin = 0
    let trader = '0xE7218b2Cacb8001A93334C6734dA4781d90bC37A'
    // for (let i = 0; i < ammInfo.length; i++) {
    //     let c = ammInfo[i]

    //     // const reserve = await c.contract.getReserve()
    //     // const maxHolding = await c.contract.getMaxHoldingBaseAsset()
    //     // const openNotionalCap = await c.contract.getOpenInterestNotionalCap()

    //     // console.log("- " + c.name + " Reserves", formatUnits(reserve[0].d, DEFAULT_DECIMALS), formatUnits(reserve[1].d, DEFAULT_DECIMALS))
    //     // console.log("- " + c.name + " Cap", formatUnits(maxHolding.d, DEFAULT_DECIMALS), formatUnits(openNotionalCap.d, DEFAULT_DECIMALS))

    //     const position = await clearingHouseViewer.getPersonalPositionWithFundingPayment(c.address, trader)
    //     const pnl = await clearingHouseViewer.getUnrealizedPnl(c.address, trader, PNL_OPTION_SPOT_PRICE)
    //     totalMargin += parseFloat(formatUnits(position.margin.d, DEFAULT_DECIMALS))
    //     console.log("- " + c.name + " position info")
    //     console.log("- size: ", formatUnits(position.size.d, DEFAULT_DECIMALS))
    //     console.log("- margin: ", formatUnits(position.margin.d, DEFAULT_DECIMALS))
    //     console.log("- pnl: ", formatUnits(pnl.d, DEFAULT_DECIMALS))
    //     console.log("---------------------------------------------------------------")
    // }
    // console.log("- total margin: ", totalMargin)

    // let users = await readUserFromFile();
    let blockNumber = await readBlockNumberFromFile()
    let scanChunk = 1000
    let currentBlockNumber = await web3.eth.getBlockNumber()

    // console.log('- last scan block', blockNumber)
    // // console.log('- last users', JSON.stringify(users))
    // console.log('- current block', currentBlockNumber)

    while (blockNumber < currentBlockNumber) {
        let err = 0
        let blk

        try {
            let end = blockNumber + scanChunk >= currentBlockNumber ? 'latest' : blockNumber + scanChunk
            console.log('- scan history', blockNumber, end)

            // await ammETHContract.getPastEvents('LiquidityChanged', {
            //     fromBlock: blockNumber,
            //     toBlock: end
            // }, function(error , events) {
            //     if (events && events.length > 0) {
            //         console.log("eth", events)
            //     }
            // })

            // await ammBTCContract.getPastEvents('LiquidityChanged', {
            //     fromBlock: blockNumber,
            //     toBlock: end
            // }, function(error , events) {
            //     if (events && events.length > 0) {
            //         console.log("btc", events)
            //     }
            // })
            
            // blk = await web3.eth.getBlock(blockNumber)

            // await clearingHouseContract.getPastEvents('PositionChanged', {
            //     // filter: {amm: ammAddr},
            //     fromBlock: blockNumber,
            //     toBlock: end
            // }, function (error, events) {
            //     // console.log(events)
            //     if (error) {
            //         console.log(error)
            //         return
            //     }

            //     events.forEach(e => {
            //         let v = e.returnValues
            //         let content = v.trader + "," + v.amm + "," +
            //             formatUnits(v.margin, DEFAULT_DECIMALS) + "," +
            //             formatUnits(v.positionNotional, DEFAULT_DECIMALS) + "," +
            //             formatUnits(v.exchangedPositionSize, DEFAULT_DECIMALS) + "," +
            //             formatUnits(v.fee, DEFAULT_DECIMALS) + "," +
            //             formatUnits(v.positionSizeAfter, DEFAULT_DECIMALS) + "," +
            //             blk.timestamp + "," +
            //             toDay(blk.timestamp) + "," +
            //             toMonth(blk.timestamp) + "\n"
            //         fs.appendFileSync(positionFilePath, content)
            //     })
            //     // console.log('- users', users)
            // })

            await layer2UsdcContract.getPastEvents('Transfer', {
                filter: {to: trader},
                fromBlock: blockNumber,
                toBlock: end
            }, function(error , events) {
                if (error) {
                    console.log(error)
                    return
                }

                events.forEach(e => {
                    let v = e.returnValues
                    // if (v.to.toUpperCase() == trader.toUpperCase()) {
                    //     console.log(v)
                    //     let content = v.from + "," + v.to + "," + formatUnits(v.value, 6) + "\n"
                    //     fs.appendFileSync(positionFilePath, content)
                    // }
                    let content = v.from + "," + v.to + "," + formatUnits(v.value, 6) + "\n"
                    fs.appendFileSync(positionFilePath, content)
                })
            })
        } catch (e) {
            console.log('- getLastEvent err', e)
            err = 1
        }

        if (err == 0) {
            blockNumber += scanChunk
            saveBlockNumberToFile(blockNumber)
        }
    }

    // await analysisUser(users)

    // clearingHouse.on('PositionChanged', function (
    //     trader,
    //     amm,
    //     margin,
    //     exchangedQuote,
    //     exchangedPosition,
    //     fee,
    //     position,
    //     realizedPnl,
    //     unrealizedPnl,
    //     badDebt,
    //     liquidationPenalty,
    //     spotPrice,
    //     fundingPayment,
    //     event) {
    //     blockNumber = event.blockNumber

    //     if (!users[amm]) {
    //         users[amm] = {}
    //     }

    //     if (!users[amm][trader]) {
    //         users[amm][trader] = {}
    //     }

    //     users[amm][trader].margin = margin
    //     users[amm][trader].position = position

    //     console.log('- blockNumber', blockNumber)
    //     console.log('- trader', trader)
    //     console.log('- amm', amm)
    //     console.log('- margin', formatUnits(margin, DEFAULT_DECIMALS))
    //     console.log('- exchangedQuote', formatUnits(exchangedQuote, DEFAULT_DECIMALS))
    //     console.log('- exchangedPosition', formatUnits(exchangedPosition, DEFAULT_DECIMALS))
    //     console.log('- fee', formatUnits(fee, DEFAULT_DECIMALS))
    //     console.log('- position', formatUnits(position, DEFAULT_DECIMALS))
    //     console.log('- realizedPnl', formatUnits(realizedPnl, DEFAULT_DECIMALS))
    //     console.log('- unrealizedPnl', formatUnits(unrealizedPnl, DEFAULT_DECIMALS))
    //     console.log('- badDebt', formatUnits(badDebt, DEFAULT_DECIMALS))
    //     console.log('- liquidationPenalty', formatUnits(liquidationPenalty, DEFAULT_DECIMALS))
    //     console.log('- spotPrice', formatUnits(spotPrice, DEFAULT_DECIMALS))
    //     console.log('- fundingPayment', formatUnits(fundingPayment, DEFAULT_DECIMALS))
    //     console.log('------------------------------------------------------------')
    // })

    // while (true) {
    //     await sleep(10000)
    //     saveUserToFile(users)
    //     saveBlockNumberToFile(blockNumber)
    // }
})()

const userFilePath = './users.txt'
const blockNumberFilePath = './blockNumber.txt'
const positionFilePath = './positionHistory.txt'

async function saveUserToFile(user) {
    let userStr = JSON.stringify(user)
    fs.openSync
    fs.truncateSync(userFilePath)
    fs.writeFileSync(userFilePath, userStr)
}

async function readUserFromFile() {
    let userStr = fs.readFileSync(userFilePath)
    if (userStr.length > 0) {
        return JSON.parse(userStr)
    }
    return {}
}

async function saveBlockNumberToFile(num) {
    fs.truncateSync(blockNumberFilePath)
    fs.writeFileSync(blockNumberFilePath, num)
}

async function readBlockNumberFromFile() {
    let num = fs.readFileSync(blockNumberFilePath)
    if (num.length > 0) {
        return parseInt(num) - 100
    }
    return 13500000
}

async function analysisUser(users) {
    let havePositionUserCount = 0
    let allUserCount = 0
    let distinctUser = {}

    for (let a in users) {
        let am = users[a]

        for (let u in am) {
            if (parseInt(am[u].position) != 0) {
                havePositionUserCount++
            }

            if (!distinctUser[u]) {
                distinctUser[u] = true
                allUserCount++
            }
        }
    }

    console.log('- all user count', allUserCount)
    console.log('- have position user count', havePositionUserCount)
}

function toDay(timestamp = +new Date()) {
    if (timestamp) {
        var time = new Date(timestamp*1000);
        var y = time.getFullYear(); //getFullYear方法以四位数字返回年份
        var M = time.getMonth() + 1; // getMonth方法从 Date 对象返回月份 (0 ~ 11)，返回结果需要手动加一
        var d = time.getDate(); // getDate方法从 Date 对象返回一个月中的某一天 (1 ~ 31)
        // var h = time.getHours(); // getHours方法返回 Date 对象的小时 (0 ~ 23)
        // var m = time.getMinutes(); // getMinutes方法返回 Date 对象的分钟 (0 ~ 59)
        // var s = time.getSeconds(); // getSeconds方法返回 Date 对象的秒数 (0 ~ 59)
        // return y + '-' + M + '-' + d + ' ' + h + ':' + m + ':' + s;
        return y + '-' + M + '-' + d;
      } else {
          return '';
      }
}

function toMonth(timestamp = +new Date()) {
    if (timestamp) {
        var time = new Date(timestamp*1000);
        var y = time.getFullYear(); //getFullYear方法以四位数字返回年份
        var M = time.getMonth() + 1; // getMonth方法从 Date 对象返回月份 (0 ~ 11)，返回结果需要手动加一
        // var d = time.getDate(); // getDate方法从 Date 对象返回一个月中的某一天 (1 ~ 31)
        // var h = time.getHours(); // getHours方法返回 Date 对象的小时 (0 ~ 23)
        // var m = time.getMinutes(); // getMinutes方法返回 Date 对象的分钟 (0 ~ 59)
        // var s = time.getSeconds(); // getSeconds方法返回 Date 对象的秒数 (0 ~ 59)
        // return y + '-' + M + '-' + d + ' ' + h + ':' + m + ':' + s;
        return y + '-' + M;
      } else {
          return '';
      }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
