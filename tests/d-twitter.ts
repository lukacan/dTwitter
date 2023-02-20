import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { DTwitter } from "../target/types/d_twitter";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("d-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.DTwitter as Program<DTwitter>;

  it('can send a new tweet', async () => {
    // Before sending the transaction to the blockchain.
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet('veganism', 'NAH', {
        accounts: {
            // Accounts here...
            tweet: tweet.publicKey,
            author: program.provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [
          tweet
          	// Key pairs of signers here...
        ],
    });

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
  	// console.log(tweetAccount);
    assert.equal(tweetAccount.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic,"veganism");
    assert.equal(tweetAccount.content,"NAH");
    assert.ok(tweetAccount.timestamp);
    // After sending the transaction to the blockchain.
  });
  it('sending tweet without topic', async () => {
    // Before sending the transaction to the blockchain.
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet('', 'NAH', {
        accounts: {
            // Accounts here...
            tweet: tweet.publicKey,
            author: program.provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [
          tweet
          	// Key pairs of signers here...
        ],
    });

    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
  	// console.log(tweetAccount);
    assert.equal(tweetAccount.author.toBase58(), program.provider.wallet.publicKey.toBase58());
    assert.equal(tweetAccount.topic,"");
    assert.equal(tweetAccount.content,"NAH");
    assert.ok(tweetAccount.timestamp);
    // After sending the transaction to the blockchain.
  });


  it('sending two tweets from same author', async () => {
    // Before sending the transaction to the blockchain.
    const otherUser = anchor.web3.Keypair.generate();
    const signature = await program.provider.connection.requestAirdrop(otherUser.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature);

    const tweet1 = anchor.web3.Keypair.generate();
    const tweet2 = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet('Tweet1', 'sending Tweet1', {
        accounts: {
            // Accounts here...
            tweet: tweet1.publicKey,
            author: otherUser.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [
          otherUser,tweet1
          	// Key pairs of signers here...
        ],
    });

    await program.rpc.sendTweet('Tweet2', 'sending Tweet2', {
      accounts: {
          // Accounts here...
          tweet: tweet2.publicKey,
          author: otherUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [
        otherUser,tweet2
          // Key pairs of signers here...
      ],
  });

    const tweet1Account = await program.account.tweet.fetch(tweet1.publicKey);
    const tweet2Account = await program.account.tweet.fetch(tweet2.publicKey);
  	
    // console.log(tweet1Account);
    // console.log(tweet2Account);
    assert.equal(tweet1Account.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweet1Account.topic,"Tweet1");
    assert.equal(tweet1Account.content,"sending Tweet1");
    assert.ok(tweet1Account.timestamp);

    assert.equal(tweet2Account.author.toBase58(), otherUser.publicKey.toBase58());
    assert.equal(tweet2Account.topic,"Tweet2");
    assert.equal(tweet2Account.content,"sending Tweet2");
    assert.ok(tweet2Account.timestamp);
    //After sending the transaction to the blockchain.
  });


  it("cannot create topic with more than 50 characters", async () => {
    const tweet = anchor.web3.Keypair.generate();
    const topicWith51Chars = 'x'.repeat(51);
    try{
      await program.rpc.sendTweet(topicWith51Chars,"sending tweet with topic with more than 50 chars",{
        accounts:{
          tweet:tweet.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        },signers:[tweet]
      });
    } catch(_err){
      assert.ok(_err instanceof AnchorError);
      assert.equal((_err as AnchorError).error.errorMessage, 'The provided topic should be 50 characters long maximum.');
      return;
    }
    assert.fail('The instruction should have failed with a 51-character topic.');
  });



  it("cannot create content with more than 280 characters", async () => {
    const tweet = anchor.web3.Keypair.generate();
    const ranodmUser = anchor.web3.Keypair.generate();
    const signature = await program.provider.connection.requestAirdrop(ranodmUser.publicKey, 1000000000);
    await program.provider.connection.confirmTransaction(signature);


    const contentWith281Chars = 'x'.repeat(281);
    try{
      await program.rpc.sendTweet("LongTweet",contentWith281Chars,{
        accounts:{
          tweet:tweet.publicKey,
          author: ranodmUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        },signers:[ranodmUser,tweet]
      });
    } catch(_err){
      assert.ok(_err instanceof AnchorError);
      assert.equal((_err as AnchorError).error.errorMessage, 'The provided content should be 280 characters long maximum.');
      return;
    }
    assert.fail('The instruction should have failed with a 281-character content.');
  });

  it("fetch my tweets", async () => {
    const authorPublicKey = program.provider.wallet.publicKey;
    const tweetAccounts = await program.account.tweet.all(
      [
        {
          memcmp:{
            offset: 8,
            bytes: authorPublicKey.toBase58()
          }
        }
      ]
    );
    assert.ok(tweetAccounts.every(tweetAccount => {
      return tweetAccount.account.author.toBase58() == authorPublicKey.toBase58()
    }));
  });



  it("fetch veganism", async () => {
    const authorPublicKey = program.provider.wallet.publicKey;
    const tweetAccounts = await program.account.tweet.all(
      [
        {
          memcmp:{
            offset: 8 + 32 + 8 + 4,
            bytes: bs58.encode(Buffer.from('veganism'))
          }
        }
      ]
    );
    assert.ok(tweetAccounts.every(tweetAccount => {
      return tweetAccount.account.topic == 'veganism'
    }));
  });

});
