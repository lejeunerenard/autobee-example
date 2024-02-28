# Autobee Example

A simple example of creating a hyperbee like class using autobase.

Autobase allows multiple input hypercores to be combined into a single output
hypercore. This output hypercore is a 'view' of the inputs. A common way to
create this view is using a hyperbee to provide a key-value store.

## Running Example Script

### Setup

```bash
npm i
```

### Running

*As Peer 1*

```bash
node example.mjs
```

Which outputs something like:
```
bootstrap undefined
db.key 0b2d7440e25d95f10d07bbf5860b77cd640e5e97cbaa2d1dee3c66214deaec28
joining 8ee02940cf97622f5af9940493350b370a09ef0f776ad48ddb1693f569bc3111

putting a key
current db key/value pairs
key 0b2d7440e25d95f10d07bbf5860b77cd640e5e97cbaa2d1dee3c66214deaec28
value { message: 'was here', timestamp: '2024-02-28T22:48:02.961Z'  }

Enter db.keys to add as a writer.
Otherwise enter 'exit' to exit.
> 
```

The `db.key` is the bootstrapping hypercore for the `autobase` you will start
other peers with this key.

The `putting a key` section is an automatic "I was here" key put call using the
peer's key as the key and a value object with the message 'was here' and a
time stamp. You can update the peer's key by typing `put` in the prompt.
Otherwise the prompt will be used to add a peer as a writer which, we will do in
a bit.

*As Peer 2*

Enter the `db.key` from *Peer 1*'s output as an argument
(`0b2d7440e25d95f10d07bbf5860b77cd640e5e97cbaa2d1dee3c66214deaec28` below). This
key will bootstrap *Peer 2* with the same autobase as *Peer 1*.

If you are running this in the same directory, set a different storage than
*Peer 1* by adding an directory name argument (eg. `storage-peer2` below).

```bash
node example.mjs 0b2d7440e25d95f10d07bbf5860b77cd640e5e97cbaa2d1dee3c66214deaec28 storage-peer2
```

Should output something like:

```
bootstrap 0b2d7440e25d95f10d07bbf5860b77cd640e5e97cbaa2d1dee3c66214deaec28
joining 8ee02940cf97622f5af9940493350b370a09ef0f776ad48ddb1693f569bc3111

putting a key
db isnt writable yet
have another writer add the following key
73c66321463d1072678cffa36b98f4933ba9d0c7046ff3465a1f61c37e91d4d6
Enter db.keys to add as a writer.
Otherwise enter 'exit' to exit.
> 
```

You should see the same `joining [discovery key]` for both peers.

You will also see that *Peer 2* is not writable right now. This is because
`autobase` requires peers to be added as 'writers' to be able to append to the
`autobase`. To do this, take the key under 'have another writer add the
following key' and enter it into *Peer 1*'s prompt. You should see *Peer 1*
output something like this:

```
Adding writer 73c66321463d1072678cffa36b98f4933ba9d0c7046ff3465a1f61c37e91d4d6
> 
```

Now try entering `put` into *Peer 2*. You should see output
showing the put was applied like the following:

```
current db key/value pairs
key 0b2d7440e25d95f10d07bbf5860b77cd640e5e97cbaa2d1dee3c66214deaec28
value { message: 'was here', timestamp: '2024-02-28T22:48:02.961Z' }

key 73c66321463d1072678cffa36b98f4933ba9d0c7046ff3465a1f61c37e91d4d6
value { message: 'was here', timestamp: '2024-02-28T23:06:09.436Z' }
```
