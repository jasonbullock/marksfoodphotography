"""Builds the File Name Description from a product name.

This string is not a label. It goes straight into the delivered file name -
`26011356_CF_Pumpkin Ice Cream_1` is job number, brand code, this, and the shot
number - so it has to survive a filesystem, a URL and whatever the client's
system does with it.

The convention comes from the studio's own tracker, where people have been
writing these by hand:

    Celtrade Vegan Mayo Spread 14.5oz              ->  Vegan Mayo
    CF Ice Cream Pumpkin Scr 48oz                  ->  Pumpkin Ice Cream
    Mariner CRACKER FLATBREAD ROSEMARY ORG 5 OZ    ->  ROSEMARY FLATBREAD
    Food Club Dry Soup Mix - Noodle Soup           ->  Noodle Soup

Brand out, size out, marketing words out. What is left is close enough to edit,
which is the point: some of those hand-written ones add knowledge that is not in
the product name at all - a "GF" or a "Cinnamon" someone read off the packaging -
and no rule is going to produce those.
"""
import re
import unicodedata

# Anything a filesystem, a URL or a client's ingest is liable to choke on. Spaces
# and commas stay: the tracker is full of them and the delivered names already
# carry them.
UNSAFE_CHARACTERS = r'[\\/:*?"<>|#%&{}$!`=+@\r\n\t]'
# Long enough for the longest real description in the tracker with room to spare,
# short enough that the whole file name stays manageable.
MAX_LENGTH = 60

# Sizes and counts. Dropped by default - the tracker drops them every time - but
# a caller can keep one when it is the only thing telling two products apart.
SIZE_PATTERN = re.compile(
    r"\b\d+(?:\.\d+)?\s*(?:oz|ounce|ounces|lb|lbs|pound|pounds|g|kg|ml|l|liter|litre"
    r"|ct|count|pk|pack|pc|pcs|piece|pieces|qt|quart|gal|gallon|in|inch)\b\.?",
    re.IGNORECASE,
)
# Words that say nothing about which product this is.
NOISE_WORDS = {
    "org", "organic", "new", "scr", "the", "a", "an",
}


def sanitise(value):
    """Strip anything that would break a file name or a URL."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    # Accented characters become their plain equivalents rather than vanishing.
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(UNSAFE_CHARACTERS, " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    # A leading or trailing dot makes a hidden file on one system and an
    # extension-less mess on another.
    text = text.strip(". -_")
    if len(text) > MAX_LENGTH:
        text = text[:MAX_LENGTH].rsplit(" ", 1)[0].strip(". -_") or text[:MAX_LENGTH]
    return text


def _brand_tokens(brands):
    """Every word a brand might appear as in a product name.

    The studio writes them run together and abbreviated - "FC -FoodClub",
    "FX -FullCircleMarket" - while the product name spells them out as "Food Club".
    So a brand contributes its code, its whole name, and the words inside a
    run-together one.
    """
    tokens = set()
    for brand in brands or []:
        # Punctuation removed rather than replaced, so "Cedar's" is one token.
        cleaned = re.sub(r"[^A-Za-z0-9 ]+", "", str(brand or ""))
        for word in cleaned.split():
            tokens.add(word.casefold())
            for part in re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z]+|[a-z]+|\d+", word):
                if len(part) > 1:
                    tokens.add(part.casefold())
    return {token for token in tokens if token}


def suggest(product_name, brands=(), keep_size=False):
    """A starting File Name Description for a product, or "" when nothing is left.

    `brands` is every name this product might be sold under - the client's brand
    prefix label, the Product's own brand - so their words can come out. A
    third-party brand nobody has told us about stays in, and someone edits it.
    """
    text = str(product_name or "").strip()
    if not text:
        return ""

    # "Food Club Dry Soup Mix - Noodle Soup" is really two halves, and the useful
    # one is on the right.
    if " - " in text:
        tail = text.split(" - ")[-1].strip()
        if tail:
            text = tail

    if not keep_size:
        text = SIZE_PATTERN.sub(" ", text)

    brand_words = _brand_tokens(brands)
    kept = []
    for word in re.split(r"\s+", text):
        # Matched without punctuation so "Cedar's" answers to a brand recorded as
        # "Cedars"; the original spelling is what gets kept.
        bare = re.sub(r"[^A-Za-z0-9]+", "", word).casefold()
        if not bare:
            continue
        if bare in brand_words or bare in NOISE_WORDS:
            continue
        # A bare number left behind by a stripped size is noise on its own.
        if not keep_size and bare.isdigit():
            continue
        kept.append(word)

    return sanitise(" ".join(kept))
