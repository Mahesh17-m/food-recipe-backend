const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
    text: String
});

router.post('/:recipeId/comment', async (req, res) => {
    const comment = new Comment({
        user: req.body.userId,
        recipe: req.params.recipeId,
        text: req.body.text
    });
    await comment.save();
    res.json({ message: "Comment added!" });
});
