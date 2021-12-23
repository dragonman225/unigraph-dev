const [contacts, setContacts] = React.useState([]);
const [newName, setNewName] = React.useState("");
const [newEmail, setNewEmail] = React.useState("");

React.useEffect(() => {
    const viewId = getRandomInt();

    unigraph.subscribeToType('$/schema/contact', (kb) => {
        setContacts(kb)
    }, viewId);

    return function cleanup () { unigraph.unsubscribe(viewId) }
}, [])

return <div>
    <TextField value={newName} onChange={(e) => setNewName(e.target.value)}>Name</TextField>
    <TextField value={newEmail} onChange={(e) => setNewEmail(e.target.value)}>Email</TextField>
    <Button onClick={() => unigraph.addObject({emails: [newEmail], name: newName}, "$/schema/contact")}>Add</Button>
    {contacts.map(el => <AutoDynamicView object={new UnigraphObject(el)} />)}
</div>